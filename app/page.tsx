import type { Metadata } from 'next';
import { AUTHOR_REF } from '../lib/author';
import { OG_BASE, TWITTER_BASE } from '../lib/seo';
import AgentPlannerClient from './agent-planner/planner-client';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@id': 'https://prompt-info.helloworldfirm.com/#webpage',
  '@type': 'WebPage',
  name: 'AI Workload Cost Calculator | Prompt Info',
  url: 'https://prompt-info.helloworldfirm.com/',
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
  title: 'AI Workload Cost Calculator | Prompt Info',
  description:
    'Estimate model usage costs for a prompt, multi-turn session, or recurring workload. Free, private, and source-transparent.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/',
  },
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/',
    title: 'AI Workload Cost Calculator | Prompt Info',
    description:
      'Estimate model usage costs for a prompt, multi-turn session, or recurring workload.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'AI Workload Cost Calculator | Prompt Info',
    description:
      'Compare request, session, monthly, and annual AI workload costs.',
  },
};

export default function Page() {
  return (
    <main id="main-content" className="w-full min-w-0">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <AgentPlannerClient />
    </main>
  );
}
