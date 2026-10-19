import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import locationNavigation from './no-location-assign-relative-destination.mjs';

// Adapted from @next/eslint-plugin-next 16.3.8's no-html-link-for-pages and
// utils/url, Copyright (c) 2025 Vercel, Inc. MIT; see THIRD_PARTY_NOTICES.md.
// Walk explicit roots with node:fs and recognize page endpoints rather than
// arbitrary app source files. No glob parser is needed.
const RESERVED_PAGES = new Set(['_app', '_document', '_error']);

function routePattern(segments) {
  let pattern = '';
  for (const segment of segments) {
    if (/^\[\[\.\.\..+\]\]$/.test(segment)) pattern += '(?:/[^/]+(?:/[^/]+)*)?';
    else if (/^\[\.\.\..+\]$/.test(segment)) pattern += '/[^/]+(?:/[^/]+)*';
    else if (/^\[.+\]$/.test(segment)) pattern += '/[^/]+';
    else pattern += '/' + segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  return new RegExp(`^${pattern || '/'}${pattern ? '/?' : ''}$`);
}

function discoverRoutes(root, customPages) {
  const routes = [];
  function walk(directory, segments, app) {
    if (!existsSync(directory)) return;
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        if ((app && entry.name.startsWith('_')) || (!app && entry.name === 'api')) continue;
        const transparent = app && (entry.name.startsWith('@') || /^\(.*\)$/.test(entry.name));
        walk(join(directory, entry.name), transparent ? segments : [...segments, entry.name], app);
      } else if (entry.isFile() && /\.[jt]sx?$/.test(entry.name)) {
        const name = entry.name.replace(/\.[jt]sx?$/, '');
        if (app ? name === 'page' : !RESERVED_PAGES.has(name)) {
          routes.push(routePattern(app || name === 'index' ? segments : [...segments, name]));
        }
      }
    }
  }
  for (const dir of customPages ?? ['pages','src/pages']) walk(resolve(root,dir),[],false);
  for (const dir of ['app','src/app']) walk(join(root,dir),[],true);
  return routes;
}

const htmlLinks = {
  meta: {
    type: 'problem',
    docs: { description: 'Use Next Link for links to real local page routes.' },
    schema: [{oneOf:[{type:'string'},{type:'array',items:{type:'string'},uniqueItems:true}]}],
    messages: { link: 'Do not use an `<a>` element to navigate to `{{href}}`. Use `<Link />` from `next/link` instead.' },
  },
  create(context) {
    const configured = context.settings.next?.rootDir ?? context.cwd;
    const roots = Array.isArray(configured) ? configured : [configured];
    // Existing literal directories can contain glob punctuation, including cwd.
    // Unsupported patterns must still fail instead of silently losing coverage.
    if (roots.some(root => typeof root !== 'string' ||
      (/[*?{}\[\]]/.test(root) && !statSync(resolve(context.cwd,root),{throwIfNoEntry:false})?.isDirectory()))) {
      throw new Error('next-local requires explicit root directories, not glob rootDir patterns');
    }
    const option=context.options[0];
    const pages=option === undefined ? undefined : (Array.isArray(option)?option:[option]);
    const routes=roots.flatMap(root=>discoverRoutes(resolve(context.cwd,root),pages));
    return {
      JSXOpeningElement(node) {
        if(node.name.type!=='JSXIdentifier'||node.name.name!=='a') return;
        const attr=name=>node.attributes.find(a=>a.type==='JSXAttribute'&&a.name.name===name);
        if(attr('download')||attr('target')?.value?.value==='_blank') return;
        const value=attr('href')?.value;
        if(value?.type!=='Literal'||typeof value.value!=='string') return;
        const href=value.value.split(/[?#]/,1)[0].replace(/\/index\.html$/,'/');
        if(!href.startsWith('/')||href.startsWith('//')) return;
        if(routes.some(route=>route.test(href))) context.report({node,messageId:'link',data:{href}});
      },
    };
  },
};

const plugin = { rules: {
  'no-html-link-for-pages': htmlLinks,
  'no-location-assign-relative-destination': locationNavigation,
} };
export default plugin;
