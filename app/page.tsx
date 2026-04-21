import type { Metadata } from 'next';
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
  return <HomePageClient />;
}
