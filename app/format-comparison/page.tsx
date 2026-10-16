import type { Metadata } from 'next';
import { AUTHOR_REF } from '../../lib/author';
import { OG_BASE, TWITTER_BASE } from '../../lib/seo';
import FormatComparisonPageClient from './page-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@id': 'https://prompt-info.helloworldfirm.com/format-comparison/#webpage',
  '@type': 'WebPage',
  name: 'Prompt Format Comparison Tool',
  url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  isPartOf: { '@id': 'https://prompt-info.helloworldfirm.com/#website' },
  datePublished: '2026-04-21',
  dateModified: '2026-10-16',
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
      <section className="mx-auto grid w-full max-w-[1500px] border-b border-rose-highlightMed">
        <div className="border-rose-highlightMed px-4 py-8 sm:px-6 md:px-12 md:py-8">
          <p className="data-label text-signal-text">Prompt text formats</p>
          <h1 className="macro-heading mt-3 max-w-6xl text-[clamp(2.2rem,4vw,4rem)]">
            What does formatting add?
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-rose-subtle sm:text-lg">
            Compare plain text with six ways of representing the same text inside a prompt. See exactly what punctuation and whitespace add to the input token count.
          </p>
          <p className="mt-6 text-xs font-medium text-rose-muted">
            <time dateTime="2026-04-21">Published April 21, 2026</time>.{' '}
            <time dateTime="2026-10-16">Updated October 16, 2026</time>.
          </p>
        </div>

      </section>

      <FormatComparisonPageClient />
    </main>
  );
}
