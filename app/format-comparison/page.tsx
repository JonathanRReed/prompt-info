import type { Metadata } from 'next';
import { AUTHOR_REF } from '../../lib/author';
import { OG_BASE, TWITTER_BASE } from '../../lib/seo';
import FormatComparisonPageClient from './page-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: 'Prompt Format Comparison Tool',
  headline: 'Prompt Format Comparison Tool',
  url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  datePublished: '2026-04-21',
  dateModified: '2026-08-29',
  author: AUTHOR_REF,
  publisher: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
    logo: {
      '@type': 'ImageObject',
      url: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-logo-normal-1200w.png',
    },
  },
  image: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-social-card-1200x630.png',
};

export const metadata: Metadata = {
  title: 'Prompt Format Comparison Tool',
  description:
    'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  },
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into common payload formats to compare readability and token planning tradeoffs.',
  },
};

export default function FormatComparisonPage() {
  return (
    <main id="main-content" className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto grid min-h-[52dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-signal-text">Payload format comparison</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            One prompt. Six payload shells.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Wrap one prompt in TOON, JSON, compact JSON, YAML, XML, and CSV, and compare token counts side by side. Every card carries the same payload, so any difference you see is pure format overhead.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            Braces, quotes, delimiters, whitespace, and closing tags all consume tokens. The smallest result depends on the payload and tokenizer, so the live comparison below reports the counts instead of assuming a winner.
          </p>
          <p className="mt-6 text-xs font-medium text-rose-muted">
            <time dateTime="2026-04-21">Published April 21, 2026</time>.{' '}
            <time dateTime="2026-08-29">Updated August 29, 2026</time>.
          </p>
        </div>
        <aside className="bg-rose-base p-5 sm:p-8">
          <p className="data-label">Formats covered</p>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>TOON for compact structured prompts.</li>
            <li>JSON and compact JSON for API payloads.</li>
            <li>YAML, XML, and CSV for common exchange formats.</li>
            <li>Selectable o200k, cl100k, p50k, and r50k token counts.</li>
            <li>Raw-prompt overhead and planner-model input cost on every card.</li>
            <li>One-click copy for each example.</li>
          </ul>
        </aside>
      </section>

      <FormatComparisonPageClient />
    </main>
  );
}
