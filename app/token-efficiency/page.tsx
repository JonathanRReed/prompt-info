import type { Metadata } from 'next';
import { AUTHOR_REF } from '../../lib/author';
import Link from 'next/link';
import { OG_BASE, TWITTER_BASE } from '../../lib/seo';
import TokenEfficiencyPageClient from './page-client';



const pageJsonLd = {
  '@context': 'https://schema.org',
  '@id': 'https://prompt-info.helloworldfirm.com/token-efficiency/#webpage',
  '@type': 'WebPage',
  name: 'LLM Token Efficiency Comparison',
  url: 'https://prompt-info.helloworldfirm.com/token-efficiency/',
  isPartOf: { '@id': 'https://prompt-info.helloworldfirm.com/#website' },
  datePublished: '2026-08-29',
  dateModified: '2026-10-15',
  author: AUTHOR_REF,
  publisher: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
};

export const metadata: Metadata = {
  title: 'LLM Token Efficiency Comparison',
  description:
    'Compare model rates and editable output lengths. Explore how visible answers and thinking tokens change a task’s API cost.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/token-efficiency/',
  },
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/token-efficiency/',
    title: 'LLM Token Efficiency Comparison',
    description:
      'Why a cheaper per-token model can cost more per task: compare verbosity, tokens per task, and effective cost per task.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'LLM Token Efficiency Comparison',
    description:
      'Why a cheaper per-token model can cost more per task: compare verbosity, tokens per task, and cost per task.',
  },
};

export default function TokenEfficiencyPage() {
  return (
    <main id="main-content" className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />

      <section className="mx-auto flex w-full max-w-[1500px] border-b border-rose-highlightMed">
        <div className="flex w-full flex-col justify-end px-4 py-8 sm:px-6 md:px-12 md:py-10">
          <p className="data-label text-signal-text">Output tradeoffs</p>
          <h1 className="macro-heading mt-3 max-w-6xl text-[clamp(2.2rem,4vw,4rem)]">
            Output length changes the bill.
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-rose-subtle sm:text-lg">
            Cost per task combines the input, the output rate, and how many output tokens a model uses for your work.
            A lower token price can still produce a higher total when the response is longer.
          </p>
          <p className="mt-6 text-xs font-medium text-rose-muted">
            Model rates and benchmark observations are dated in the comparison below.
          </p>
        </div>
      </section>

      <TokenEfficiencyPageClient />

      <section className="mx-auto w-full max-w-[1500px] p-5 sm:p-8">
        <h2 className="text-lg font-semibold">Using this comparison</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-rose-subtle">
          <li>For engineers: enter token measurements from comparable tasks. Equal token counts compare rates; they do not prove equivalent quality or efficiency.</li>
          <li>For educators: double the output count while holding the rates fixed, then change the output rate. The bars show how both quantities affect the bill.</li>
          <li>Thinking can be billed as output even when it is not visible in the answer. A reasoning effort setting does not promise a particular token count.</li>
          <li>For multi-request work, use the <Link href="/" className="underline">cost calculator</Link>. It accounts for repeated context, caching, summaries and independent agents.</li>
        </ul>
      </section>
    </main>
  );
}
