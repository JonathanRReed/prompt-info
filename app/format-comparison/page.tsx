import type { Metadata } from 'next';
import FormatComparisonPageClient from './page-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'TechArticle',
  name: 'Prompt Format Comparison Tool',
  headline: 'Prompt Format Comparison Tool',
  url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  datePublished: '2026-04-21',
  dateModified: '2026-06-19',
  author: {
    '@type': 'Person',
    name: 'Jonathan R. Reed',
    url: 'https://jonathanrreed.com/',
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
            Wrap one prompt in TOON, JSON, compact JSON, YAML, XML, and CSV, and compare token counts side by side. Every card carries the same payload, so any difference you see is pure format overhead.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            Punctuation drives the difference. Braces, quotes, and closing tags all tokenize, which is why compact JSON and TOON usually land near the bottom of the bill and XML near the top. Pick the cheapest format your pipeline can parse without extra ceremony.
          </p>
          <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
            By Jonathan R. Reed for Hello.World Consulting. <time dateTime="2026-06-19">Updated June 19, 2026</time>.
          </p>
        </div>
        <aside className="bg-rose-base p-5 sm:p-8">
          <p className="data-label">Formats covered</p>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>TOON for compact structured prompts.</li>
            <li>JSON and compact JSON for API payloads.</li>
            <li>YAML, XML, and CSV for common exchange formats.</li>
            <li>Live o200k token counts on every card.</li>
            <li>One-click copy for each example.</li>
          </ul>
        </aside>
      </section>

      <FormatComparisonPageClient />
    </main>
  );
}
