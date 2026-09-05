import type { Metadata } from 'next';
import { OG_BASE, TWITTER_BASE } from '../../lib/seo';

const highlights = [
  { title: 'Workload planning', body: 'Compare request, session, monthly, and annual model cost for the prompt and run pattern you actually expect.' },
  { title: 'Format comparison', body: 'Render the same prompt as TOON, JSON, YAML, XML, and CSV for practical payload review.' },
  { title: 'Token efficiency', body: 'Compare cost per completed task with Artificial Analysis evidence kept separate from your workload assumptions.' },
  { title: 'Sourced catalogs', body: 'Every pricing and benchmark response reports its source, retrieval time, freshness, and fallback state.' },
];

const links = [
  { label: 'Artificial Analysis', href: 'https://artificialanalysis.ai/' },
  { label: 'Artificial Analysis Data API', href: 'https://artificialanalysis.ai/data-api/docs' },
  { label: 'OpenRouter model pricing', href: 'https://openrouter.ai/docs/overview/models' },
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
  dateModified: '2026-09-01',
  author: {
    '@type': 'Person',
    name: 'Jonathan R. Reed',
    url: 'https://jonathanrreed.com/',
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
    'How Prompt Info measures prompt tokens, estimates model costs, and compares payload formats before a request reaches a provider.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/about/',
  },
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/about/',
    title: 'About Prompt Info',
    description:
      'How Prompt Info measures prompt tokens, estimates model costs, and compares payload formats before a request reaches a provider.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'About Prompt Info',
    description:
      'How Prompt Info measures prompt tokens, estimates model costs, and compares payload formats.',
  },
};

export default function AboutPage() {
  return (
    <main id="main-content" className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto grid min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-signal-text">About the utility</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            Prompt inspection for model operators.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Prompt Info is a free calculator for estimating model usage across prompts, multi-turn sessions, and recurring workloads before execution.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            Prompt text stays in browser memory. Same-origin server routes collect public pricing and benchmark catalogs, while every estimate prints its assumptions beside the result. There is nothing to sign up for.
          </p>
          <p className="mt-6 text-xs font-medium text-rose-muted">
            <time dateTime="2026-04-21">Published April 21, 2026</time>.{' '}
            <time dateTime="2026-09-01">Updated September 1, 2026</time>.
          </p>
        </div>
        <aside className="grid gap-px bg-rose-highlightMed">
          {[
            ['Status', 'Public web utility'],
            ['Data', 'OpenRouter plus Artificial Analysis'],
            ['Owner', 'Jonathan R. Reed'],
          ].map(([label, value]) => (
            <dl key={label} className="bg-rose-base p-5">
              <dt className="data-label">{label}</dt>
              <dd className="mt-4 text-xl font-bold text-rose-text">{value}</dd>
            </dl>
          ))}
        </aside>
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px sm:grid-cols-2 lg:grid-cols-4">
        {highlights.map(item => (
          <article key={item.title} className="bg-rose-base p-5 sm:p-7 md:min-h-72">
            <h2 className="text-sm font-semibold text-rose-text">{item.title}</h2>
            <p className="mt-6 text-sm leading-7 text-rose-subtle">{item.body}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <article className="bg-rose-base p-5 sm:p-8 md:p-10">
          <p className="data-label">Operational notes</p>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>Token counts use gpt-tokenizer, with selectable OpenAI BPE tokenizers: o200k, cl100k, p50k, p50k edit, and r50k. OpenAI counts are exact.</li>
            <li>Non-OpenAI vendors bill with their own tokenizers, which typically produce more tokens than OpenAI BPE for the same text. Cost math applies a per-provider calibration multiplier so estimates do not undercount.</li>
            <li>Agent scenario estimates re-send conversation history each turn, bill cached context at the provider&apos;s cache read rate, apply cache write premiums where charged, and simulate compaction summarization calls.</li>
            <li>Pricing first uses the live OpenRouter text-model catalog, then the project database cache, then a dated bundled catalog. The active source and fallback reason remain visible.</li>
            <li>Artificial Analysis supplies the attributed benchmark catalog for intelligence, coding, agentic, speed, and cost-per-task evidence when the active source provides each field.</li>
            <li>Recurring workload projections include model usage only. They do not add human labor or review costs.</li>
            <li>Cost estimates are planning values. Provider billing may differ by model version and feature use.</li>
            <li>Pasted prompt text is held only in React memory. It is not stored, logged, sent to the catalog routes, or written to local storage. There are no accounts.</li>
            <li>The browser contacts only same-origin Prompt Info routes for pricing and benchmark data. Upstream credentials remain server-side.</li>
            <li>Format output is for inspection and planning. Downstream APIs will not all accept the same structure.</li>
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
                className="min-h-16 bg-rose-base p-4 text-xs font-medium text-rose-subtle transition duration-200 hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
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
