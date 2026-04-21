import type { Metadata } from 'next';

const highlights = [
  { title: 'Token planning', body: 'Paste a prompt, pick a model, change tokenizers, and estimate cost before sending.' },
  { title: 'Format comparison', body: 'Render the same prompt as TOON, JSON, YAML, XML, and CSV for practical payload review.' },
  { title: 'Resilient data path', body: 'Use a same-origin pricing API when available, with a static model catalog as the fallback.' },
];

const links = [
  { label: 'TOON spec', href: 'https://github.com/toon-format/toon' },
  { label: 'YAML 1.2.2', href: 'https://yaml.org/spec/1.2.2/' },
  { label: 'RFC 8259 JSON', href: 'https://www.rfc-editor.org/info/rfc8259' },
  { label: 'XML 1.1 W3C', href: 'https://www.w3.org/TR/xml11/' },
  { label: 'RFC 4180 CSV', href: 'https://www.rfc-editor.org/rfc/rfc4180' },
  { label: 'OpenAPI 3.1', href: 'https://spec.openapis.org/oas/latest.html' },
  { label: 'JSON Schema 2020-12', href: 'https://json-schema.org/draft/2020-12/schema' },
];

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'About Prompt Info',
  url: 'https://prompt-info.helloworldfirm.com/about/',
  datePublished: '2026-04-21',
  dateModified: '2026-04-21',
  author: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
};

export const metadata: Metadata = {
  title: 'About Prompt Info',
  description:
    'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats before execution.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/about/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/about/',
    title: 'About Prompt Info',
    description:
      'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats before execution.',
    images: ['/logo.avif'],
  },
  twitter: {
    title: 'About Prompt Info',
    description:
      'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats.',
    images: ['/logo.avif'],
  },
};

export default function AboutPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto grid min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-rose-love">About the utility</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            Prompt inspection for model operators.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Prompt Info is a small technical workspace for measuring token count, projected cost, and payload format before model execution. It is built by Hello.World Consulting for developers, product teams, and AI engineers who need fast prompt checks without a login flow.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            The tool is meant for preflight review: paste or draft a request, choose a tokenizer, inspect estimated usage, and compare structured payload shapes before a call reaches a provider. It keeps the practical planning details close to the prompt instead of burying them in separate spreadsheets or docs.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            The product is intentionally narrow. It focuses on client-side measurement, transparent assumptions, and repeatable reference examples for teams evaluating model usage. That scope keeps the interface quick, reduces data handling surface area, and makes the results easier to verify during engineering review.
          </p>
          <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
            By Hello.World Consulting. <time dateTime="2026-04-21">Updated April 21, 2026</time>.
          </p>
        </div>
        <aside className="grid gap-px bg-rose-highlightMed">
          {[
            ['Status', 'Public web utility'],
            ['Data', 'Same-origin API plus fallback JSON'],
            ['Owner', 'Hello.World Consulting'],
          ].map(([label, value]) => (
            <dl key={label} className="bg-rose-base p-5">
              <dt className="data-label">{label}</dt>
              <dd className="mt-4 text-xl font-bold text-rose-text">{value}</dd>
            </dl>
          ))}
        </aside>
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-3">
        {highlights.map(item => (
          <article key={item.title} className="bg-rose-base p-5 sm:p-7 md:min-h-72">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{item.title}</h2>
            <p className="mt-6 text-sm leading-7 text-rose-subtle">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article className="bg-rose-base p-5 sm:p-8 md:p-10">
          <p className="data-label">Operational notes</p>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>Token counts use gpt-tokenizer, with selectable OpenAI BPE tokenizers: o200k, cl100k, p50k, p50k edit, and r50k.</li>
            <li>Cost estimates are planning values. Provider billing may differ by model version and feature use.</li>
            <li>The interface is designed for preflight review, not storage or user account management.</li>
            <li>Format output is generated for inspection and planning, not as a guarantee that every downstream API accepts the same structure.</li>
            <li>Model metadata is treated as a working catalog. When the live pricing endpoint is unavailable, the interface falls back to the bundled reference file so the utility remains usable.</li>
          </ul>
        </article>
        <article className="bg-rose-base p-5 sm:p-8 md:p-10">
          <p className="data-label">References</p>
          <div className="mt-6 grid gap-px bg-rose-highlightMed sm:grid-cols-2">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-16 bg-rose-base p-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-rose-subtle transition duration-200 hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
              >
                {link.label}
              </a>
            ))}
          </div>
        </article>
      </section>
    </main>
  );
}
