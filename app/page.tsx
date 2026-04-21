import type { Metadata } from 'next';
import Link from 'next/link';
import HomePageClient from './page-client';

export const metadata: Metadata = {
  title: 'LLM Token Counter and Cost Calculator',
  description:
    'Count prompt tokens, estimate LLM request costs, compare tokenizers, and plan output budgets before sending model requests.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/',
    title: 'LLM Token Counter and Cost Calculator',
    description:
      'Count prompt tokens, estimate LLM request costs, compare tokenizers, and plan output budgets before sending model requests.',
  },
  twitter: {
    title: 'LLM Token Counter and Cost Calculator',
    description:
      'Count prompt tokens, estimate LLM request costs, compare tokenizers, and plan output budgets.',
  },
};

export default function Page() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <section className="prompt-hero mx-auto flex min-h-[68dvh] w-full max-w-[1500px] border-b border-rose-highlightMed">
        <div className="flex w-full flex-col justify-end px-4 pb-12 pt-16 sm:px-6 md:px-12 md:pb-16">
          <p className="data-label text-rose-love">Prompt Info</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3.2rem,8vw,7.2rem)]">
            Know the bill before the model runs.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Prompt Info is a browser-based LLM token counter and cost calculator for people who need to check how many tokens are in a prompt before a model request runs. Paste draft text, choose a model, compare OpenAI tokenizer families, estimate output size, and export a planning receipt for longer agent sessions.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <a className="action-primary" href="#planner">
              Analyze prompt
            </a>
            <Link className="action-secondary" href="/format-comparison/">
              Convert format
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-3">
        {[
          ['Token counter', 'Count GPT-style BPE tokens with o200k, cl100k, p50k, p50k edit, and r50k tokenizers.'],
          ['Cost calculator', 'Estimate input, output, and multi-turn agent costs before sending expensive model calls.'],
          ['Prompt format lab', 'Compare the same prompt as TOON, JSON, YAML, XML, CSV, and compact JSON for payload planning.'],
        ].map(([title, body]) => (
          <article key={title} className="bg-rose-base p-5 sm:p-7 md:min-h-64">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{title}</h2>
            <p className="mt-6 text-sm leading-7 text-rose-subtle">{body}</p>
          </article>
        ))}
      </section>

      <HomePageClient />
    </main>
  );
}
