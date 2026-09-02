import type { Metadata } from 'next';
import Link from 'next/link';
import { OG_BASE, TWITTER_BASE } from '../../lib/seo';
import { EFFICIENCY_PRESETS, EFFICIENCY_REFERENCE_DATE } from '../../lib/tokenEfficiency';
import TokenEfficiencyPageClient from './page-client';

const sources = [
  { label: 'Artificial Analysis: GPT-5.6 Sol', href: 'https://artificialanalysis.ai/models/gpt-5-6-sol' },
  { label: 'Artificial Analysis: Kimi K3', href: 'https://artificialanalysis.ai/models/kimi-k3' },
  { label: 'Artificial Analysis: Gemini 3.7 Flash', href: 'https://artificialanalysis.ai/models/gemini-3-7-flash' },
  { label: 'OpenAI: GPT-5.6 announcement', href: 'https://openai.com/index/gpt-5-6/' },
];

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'LLM Token Efficiency Comparison',
  url: 'https://prompt-info.helloworldfirm.com/token-efficiency/',
  datePublished: '2026-08-29',
  dateModified: '2026-08-29',
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
  title: 'LLM Token Efficiency Comparison',
  description:
    'Why a cheaper per-token model can cost more per task: compare model verbosity, output tokens per completed task, and effective cost per task across GPT-5.6 Sol, Kimi K3, and Gemini 3.7 Flash.',
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

function formatUsd(value: number) {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function TokenEfficiencyPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />

      <section className="mx-auto flex min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed">
        <div className="flex w-full flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-12 md:pb-16">
          <p className="data-label text-rose-love">Token efficiency</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            Token price is only half the cost.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Cost per task combines the input, the output rate, and how many output tokens a model uses for your work.
            A lower token price can still produce a higher total when the response is longer.
          </p>
          <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
            <time dateTime="2026-08-29">Published August 29, 2026</time>. Reference data retrieved {EFFICIENCY_REFERENCE_DATE}.
          </p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1500px] border-x border-b border-rose-highlightMed bg-rose-base px-4 py-12 sm:px-6 md:px-12 md:py-16">
        <p className="data-label">Dated reference snapshot</p>
        <h2 className="mt-4 max-w-4xl text-[clamp(2.2rem,5vw,4.6rem)] font-black uppercase leading-[0.9] tracking-[-0.06em] text-rose-text">
          Output length can change the price order.
        </h2>
        <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
          This August 29 snapshot uses three published Artificial Analysis configurations to show why output length
          belongs beside the rate card. It is a worked example, not a current model ranking or a recommendation.
        </p>

        <div className="mt-8 overflow-x-auto border border-rose-highlightMed">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead>
              <tr className="border-b border-rose-highlightMed">
                {['Model', 'Input $/M', 'Output $/M', 'Output tokens, full suite', 'Cost to run the suite', 'Intelligence index'].map(heading => (
                  <th key={heading} className="bg-rose-overlay px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-muted">
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {EFFICIENCY_PRESETS.map(preset => (
                <tr key={preset.key} className="border-b border-rose-highlightMed last:border-b-0">
                  <th scope="row" className="px-4 py-4 text-sm font-bold text-rose-text">
                    {preset.name}
                    <span className="mt-1 block text-xs font-normal normal-case text-rose-muted">{preset.pricingNote}</span>
                  </th>
                  <td className="px-4 py-4 font-mono text-sm font-bold text-rose-text tabular-nums">${preset.inputPerMillion.toLocaleString()}</td>
                  <td className="px-4 py-4 font-mono text-sm font-bold text-rose-text tabular-nums">${preset.outputPerMillion.toLocaleString()}</td>
                  <td className="px-4 py-4 font-mono text-sm font-bold text-rose-text tabular-nums">{preset.indexOutputTokensMillions}M</td>
                  <td className="px-4 py-4 font-mono text-sm font-bold text-rose-love tabular-nums">{formatUsd(preset.indexEvalCost)}</td>
                  <td className="px-4 py-4 font-mono text-sm font-bold text-rose-text tabular-nums">{preset.intelligenceIndex}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-muted">
          The live comparison below is editable. Replace the example models and token counts with measurements from
          your own task before using the result for planning.
        </p>
      </section>

      <TokenEfficiencyPageClient />

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <article className="bg-rose-base p-5 sm:p-8 md:p-10">
          <p className="data-label">Reading the numbers</p>
          <ul className="mt-6 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>Verbosity is a model property AND a setting. The same model at a higher reasoning effort can spend several times the tokens; the presets above use each model&apos;s max or high configuration.</li>
            <li>Per-task token counts are planning estimates anchored to Artificial Analysis&apos; published totals for one benchmark suite. Your prompts, tool calls, and stop conditions will produce different counts.</li>
            <li>Reasoning tokens bill as output on every one of these models, which is why verbose thinking shows up directly on the invoice.</li>
            <li>Promotional rates skew comparisons. Two of the three presets are running time-limited pricing; the notes on each row say what expires and when.</li>
            <li>Efficiency compounds in agent sessions: every extra output token is re-sent as input on each later turn. The <Link href="/" className="underline decoration-rose-love underline-offset-4 hover:text-rose-text">cost calculator</Link> models that loop with caching and compaction.</li>
          </ul>
        </article>
        <article className="bg-rose-base p-5 sm:p-8 md:p-10">
          <p className="data-label">Sources</p>
          <div className="mt-6 grid gap-px bg-rose-highlightMed">
            {sources.map(source => (
              <a
                key={source.href}
                href={source.href}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-16 bg-rose-base p-4 font-mono text-xs font-bold uppercase tracking-[0.12em] text-rose-subtle transition duration-200 hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
              >
                {source.label}
              </a>
            ))}
          </div>
          <p className="mt-5 text-sm leading-6 text-rose-muted">
            Retrieved {EFFICIENCY_REFERENCE_DATE}. Benchmark scores, token counts, and prices move; treat every number
            on this page as a dated snapshot.
          </p>
        </article>
      </section>
    </main>
  );
}
