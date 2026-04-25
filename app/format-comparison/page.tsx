import type { Metadata } from 'next';
import FormatComparisonPageClient from './page-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: 'Prompt Format Comparison Tool',
  headline: 'Prompt Format Comparison Tool',
  url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
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
    logo: {
      '@type': 'ImageObject',
      url: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-logo-normal-1200w.png',
    },
  },
  image: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-logo-normal-1200w.png',
};

export const metadata: Metadata = {
  title: 'Prompt Format Comparison Tool',
  description:
    'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
    images: ['/prompt_info_assets/prompt-info-logo-normal-1200w.png'],
  },
  twitter: {
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into common payload formats to compare readability and token planning tradeoffs.',
    images: ['/prompt_info_assets/prompt-info-logo-normal-1200w.png'],
  },
};

export default function FormatComparisonPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto grid min-h-[52dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-rose-love">Format laboratory</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            One prompt. Six payload shells.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Convert one prompt into TOON, JSON, compact JSON, YAML, XML, and CSV examples. The comparison helps teams choose payload formats that are readable, compact, and easy to inspect before model execution.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            Use the format lab to compare how field names, nested values, lists, and repeated metadata change across payload styles. The examples are designed for planning and review, so teams can spot verbosity, escaping, and readability tradeoffs before adopting a prompt transport format.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            The generated examples are deliberately simple, which makes the differences easier to inspect. Use them to decide whether a structured request should favor compactness, strict syntax, human editing, or compatibility with an existing ingestion pipeline.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            For implementation reviews, compare indentation, escaping rules, repeated labels, and how comfortably a teammate can scan the same information during a code review. A compact representation can save tokens, while a more verbose representation may be easier to debug, document, and hand off across teams.
          </p>
          <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
            By Hello.World Consulting. <time dateTime="2026-04-21">Updated April 21, 2026</time>.
          </p>
        </div>
        <aside className="bg-rose-base p-5 sm:p-8">
          <p className="data-label">Formats covered</p>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>TOON for compact structured prompts.</li>
            <li>JSON and compact JSON for API payloads.</li>
            <li>YAML, XML, and CSV for common exchange formats.</li>
            <li>Side-by-side token estimates for planning tradeoffs.</li>
            <li>Copyable examples for documentation, tests, and review notes.</li>
          </ul>
        </aside>
      </section>

      <FormatComparisonPageClient />
    </main>
  );
}
