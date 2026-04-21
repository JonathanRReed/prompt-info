import type { Metadata } from 'next';
import AboutPageClient from './page-client';

export const metadata: Metadata = {
  title: 'About Prompt Info',
  description:
    'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats before execution.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/about/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/about/',
    title: 'About Prompt Info',
    description:
      'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats before execution.',
  },
  twitter: {
    title: 'About Prompt Info',
    description:
      'Learn how Prompt Info helps developers measure prompt tokens, estimate model costs, and compare payload formats.',
  },
};

export default function AboutPage() {
  return <AboutPageClient />;
}
