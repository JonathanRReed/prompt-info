import CarbonPageClient from './CarbonPageClient';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Carbon Footprint Calculator - Estimate LLM Emissions',
  description: 'Calculate the carbon footprint of your LLM prompts. Track CO₂e emissions per token across different AI models and optimize for sustainability.',
  keywords: ['AI carbon footprint', 'LLM emissions', 'CO2 calculator', 'sustainable AI', 'green AI', 'carbon tracking', 'AI sustainability', 'prompt emissions'],
  openGraph: {
    title: 'AI Carbon Footprint Calculator - Estimate LLM Emissions',
    description: 'Calculate the carbon footprint of your LLM prompts and optimize for sustainability.',
    url: 'https://prompt-info.helloworldfirm.com/carbon',
  },
  twitter: {
    title: 'AI Carbon Footprint Calculator - Estimate LLM Emissions',
    description: 'Calculate the carbon footprint of your LLM prompts and optimize for sustainability.',
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/carbon',
  },
};

export default function CarbonPage() {
  return <CarbonPageClient />;
}
