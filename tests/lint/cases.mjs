// Inputs are run through the original Next 16.3.8 rule and its replacement.
// expected is the number of diagnostics for that rule only, not parser errors.
const pair = (rule, bad, good, filename = 'app/example.tsx') => [
  { name: `${rule}: invalid`, rule, code: bad, filename, expected: 1 },
  { name: `${rule}: valid`, rule, code: good, filename, expected: 0 },
];

export const cases = [
  ...pair('google-font-display', 'const x = <link href="https://fonts.googleapis.com/css?family=Roboto" />;', 'const x = <link href="https://fonts.googleapis.com/css?family=Roboto&display=swap" />;'),
  ...pair('google-font-preconnect', 'const x = <link href="https://fonts.gstatic.com" />;', 'const x = <link href="https://fonts.gstatic.com" rel="preconnect" />;'),
  ...pair('next-script-for-ga', 'const x = <script src="https://www.google-analytics.com/analytics.js" />;', 'import Script from "next/script"; const x = <Script src="https://www.google-analytics.com/analytics.js" />;'),
  ...pair('no-async-client-component', '"use client"; export default async function Example() { return <div />; }', 'export default async function Example() { return <div />; }'),
  ...pair('no-before-interactive-script-outside-document', 'import Script from "next/script"; const x = <Script src="/a.js" strategy="beforeInteractive" />;', 'import Script from "next/script"; const x = <Script src="/a.js" strategy="afterInteractive" />;', 'pages/index.tsx'),
  ...pair('no-css-tags', 'const x = <link rel="stylesheet" href="/a.css" />;', 'const x = <link rel="stylesheet" href="https://example.com/a.css" />;'),
  ...pair('no-head-element', 'const x = <head><title>Example</title></head>;', 'const x = <header>Example</header>;', 'pages/example.tsx'),
  ...pair('no-img-element', 'const x = <img src="/a.png" alt="Example" />;', 'const x = <picture><img src="/a.png" alt="Example" /></picture>;'),
  ...pair('no-page-custom-font', 'const x = <link href="https://fonts.googleapis.com/css?family=Roboto" rel="stylesheet" />;', 'const x = <link href="/fonts.css" rel="stylesheet" />;', 'pages/index.tsx'),
  ...pair('no-styled-jsx-in-document', 'const x = <style jsx>{`body{color:red}`}</style>;', 'const x = <style>{`body{color:red}`}</style>;', 'pages/_document.tsx'),
  ...pair('no-sync-scripts', 'const x = <script src="/a.js" />;', 'const x = <script src="/a.js" async />;'),
  ...pair('no-title-in-document-head', 'import {Head} from "next/document"; const x = <Head><title>Example</title></Head>;', 'import Head from "next/head"; const x = <Head><title>Example</title></Head>;', 'pages/_document.tsx'),
  ...pair('no-typos', 'export function getStaticProp() {}', 'export function getStaticProps() {}', 'pages/example.tsx'),
  ...pair('no-unwanted-polyfillio', 'const x = <script src="https://polyfill.io/v3/polyfill.min.js?features=Promise" />;', 'const x = <script src="/polyfill.js" />;'),
  ...pair('inline-script-id', 'import Script from "next/script"; const x = <Script>{`console.log(1)`}</Script>;', 'import Script from "next/script"; const x = <Script id="example">{`console.log(1)`}</Script>;'),
  ...pair('no-assign-module-variable', 'const module = {};', 'const result = {};'),
  ...pair('no-document-import-in-page', 'import Document from "next/document"; export default Document;', 'import Document from "next/document"; export default Document;', 'pages/example.tsx').map((c, i) => i ? {...c, filename: 'pages/_document.tsx'} : c),
  ...pair('no-duplicate-head', 'import Document, {Head, Html} from "next/document"; export default class Doc extends Document { render() { return <Html><Head /><Head /></Html>; } }', 'import Document, {Head, Html} from "next/document"; export default class Doc extends Document { render() { return <Html><Head /></Html>; } }', 'pages/_document.tsx'),
  ...pair('no-head-import-in-document', 'import Head from "next/head"; const x = <Head />;', 'import {Head} from "next/document"; const x = <Head />;', 'pages/_document.tsx'),
  ...pair('no-script-component-in-head', 'import Head from "next/head"; import Script from "next/script"; const x = <Head><Script src="/a.js" /></Head>;', 'import Head from "next/head"; const x = <Head><title>Example</title></Head>;'),
  ...pair('no-html-link-for-pages', 'const x = <a href="/about/">About</a>;', 'const x = <a href="/missing/">Missing</a>;'),
  ...['/about?from=test#heading', '/posts/hello', '/docs/a/b', '/optional', '/optional/a/b'].map(href => ({name:`route ${href}`,rule:'no-html-link-for-pages',filename:'app/example.tsx',code:`const x = <a href=${JSON.stringify(href)}>Route</a>;`,expected:1})),
  ...['/assets/file.pdf', '/missing/', '#section', 'https://example.com/about/', '//example.com/about/'].map(href => ({name:`non-route ${href}`,rule:'no-html-link-for-pages',filename:'app/example.tsx',code:`const x = <a href=${JSON.stringify(href)}>Other</a>;`,expected:0})),
  ...['download','target="_blank"'].map(attr => ({name:`link exemption ${attr}`,rule:'no-html-link-for-pages',filename:'app/example.tsx',code:`const x = <a href="/about/" ${attr}>About</a>;`,expected:0})),
  ...[
    ['bare assign', 'location.assign("/about")',1],
    ['window href','window.location.href = "/about"',1],
    ['globalThis computed','globalThis["location"]["assign"]("/about")',1],
    ['self href','self.location.href = "/about"',1],
    ['document href','document.location.href = "/about"',1],
    ['template','window.location.assign(`/posts/${slug}`)',1],
    ['concatenation','location.assign("/posts/" + slug)',1],
    ['variable','const dest = "/about"; location.assign(dest)',1],
    ['last assignment','let dest = "https://example.com"; dest = "/about"; location.assign(dest)',1],
    ['external','location.assign("https://example.com")',0],
    ['protocol relative','location.href = "//example.com"',0],
    ['unknown destination','function navigate(dest) { location.assign(dest) }',0],
    ['shadowed location','function navigate(location) { location.assign("/about") }',0],
    ['shadowed window','function navigate(window) { window.location.href = "/about" }',0],
    ['shadowed globalThis','const globalThis = {location:{}}; globalThis.location.href = "/about"',0],
    ['block shadow','{ const location = {assign(){}}; location.assign("/about") }',0],
  ].map(([name,code,expected])=>({name:`location ${name}`,rule:'no-location-assign-relative-destination',code,expected,filename:'app/example.tsx'})),
];

export const routeFiles = [
  'app/page.tsx', 'pages/about.tsx', 'app/posts/[slug]/page.tsx',
  'app/docs/[...path]/page.tsx', 'app/optional/[[...path]]/page.tsx',
];
