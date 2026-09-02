import type { Metadata } from 'next';
import { OG_BASE, TWITTER_BASE } from '../lib/seo';
import HomePageClient from './page-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'AI Workload Cost Calculator',
  url: 'https://prompt-info.helloworldfirm.com/',
  datePublished: '2026-04-21',
  dateModified: '2026-09-01',
  author: {
    '@type': 'Person',
    name: 'Jonathan R. Reed',
    url: 'https://jonathanrreed.com/',
    sameAs: [
      'https://jonathanrreed.com/',
      'https://github.com/JonathanRReed',
    ],
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
  image: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-social-card-1200x630.png',
};

export const metadata: Metadata = {
  title: 'AI Workload Cost Calculator',
  description:
    'Estimate model usage costs for a prompt, multi-turn session, or recurring workload. Free, private, and source-transparent.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/',
  },
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/',
    title: 'AI Workload Cost Calculator',
    description:
      'Estimate model usage costs for a prompt, multi-turn session, or recurring workload.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'AI Workload Cost Calculator',
    description:
      'Compare request, session, monthly, and annual AI workload costs.',
  },
};

export default function Page() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="prompt-hero prompt-hero-compact mx-auto flex w-full max-w-[1500px] border-x border-b border-rose-highlightMed">
        <div className="grid w-full gap-5 px-4 py-8 sm:px-6 md:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)] md:items-end md:px-10 md:py-10">
          <div>
            <p className="data-label text-rose-love">Prompt cost calculator</p>
            <h1 className="macro-heading mt-4 max-w-6xl text-[clamp(2.6rem,5.6vw,5.8rem)]">
              See what a prompt or AI session could cost.
            </h1>
          </div>
          <div>
            <p className="hero-deck max-w-xl text-sm leading-7 text-rose-subtle sm:text-base">
              Paste a prompt, choose models, and estimate request, session, monthly, and annual model usage before anything runs.
            </p>
            <p className="hero-proof mt-4 font-mono text-[11px] font-bold uppercase leading-5 tracking-[0.14em] text-rose-muted">
              No account. No payment. Prompt text stays in your browser.
            </p>
          </div>
        </div>
      </section>

      <HomePageClient />
    </main>
  );
}
