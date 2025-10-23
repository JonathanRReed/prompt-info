import '../styles/globals.css'
import { ReactNode } from 'react'
import Image from 'next/image'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  metadataBase: new URL('https://prompt-info.helloworldfirm.com'),
  title: {
    default: 'Prompt Info - LLM Token Counter, Cost Calculator & Carbon Footprint Tracker',
    template: '%s | Prompt Info'
  },
  description: 'Analyze LLM prompts with real-time token counting, accurate cost estimation across 1000+ models, and carbon footprint tracking. Built for developers and AI engineers.',
  keywords: [
    'LLM token counter',
    'GPT tokenizer',
    'prompt cost calculator',
    'AI carbon footprint',
    'BPE tokenizer',
    'token visualization',
    'LLM cost estimation',
    'prompt analysis',
    'GPT token count',
    'AI sustainability',
    'carbon emissions AI',
    'prompt engineering tools'
  ],
  authors: [
    { name: 'Jonathan Reed', url: 'https://jonathanrreed.com' },
    { name: 'Hello.World Consulting', url: 'https://helloworldfirm.com' }
  ],
  creator: 'Jonathan Reed',
  publisher: 'Hello.World Consulting',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://prompt-info.helloworldfirm.com',
    siteName: 'Prompt Info',
    title: 'Prompt Info - LLM Token Counter & Cost Calculator',
    description: 'Analyze LLM prompts with real-time token counting, cost estimation across 1000+ models, and carbon footprint tracking.',
    images: [
      {
        url: '/logo.avif',
        width: 1200,
        height: 630,
        alt: 'Prompt Info - LLM Analysis Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Info - LLM Token Counter & Cost Calculator',
    description: 'Analyze LLM prompts with real-time token counting, cost estimation, and carbon footprint tracking.',
    creator: '@JonathanRReed',
    images: ['/logo.avif'],
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com',
  },
  category: 'Technology',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Prompt Info',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description: 'Analyze LLM prompts with real-time token counting, accurate cost estimation across 1000+ models, and carbon footprint tracking.',
    url: 'https://prompt-info.helloworldfirm.com',
    author: {
      '@type': 'Person',
      name: 'Jonathan Reed',
      url: 'https://jonathanrreed.com',
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hello.World Consulting',
      url: 'https://helloworldfirm.com',
    },
    inLanguage: 'en-US',
    keywords: 'LLM token counter, GPT tokenizer, prompt cost calculator, AI carbon footprint, BPE tokenizer',
  };

  return (
    <html lang="en" className="p-0 m-0">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#191724" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/Favicon/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-gradient-to-br from-rose-base via-rose-surface to-rose-base p-0 m-0 font-sans text-rose-text antialiased">
        <div className="flex min-h-screen flex-col p-0 m-0">
          <main className="relative flex flex-1 flex-col items-center justify-center bg-transparent p-0 m-0">
            {children}
          </main>
          <footer className="flex w-full flex-col items-center justify-center pb-12">
            <div className="mx-auto flex max-w-lg flex-col items-start gap-4 rounded-3xl border border-rose-highlightMed/60 bg-rose-surface/70 px-8 py-6 shadow-[0_30px_80px_-40px_rgba(25,23,36,0.8)] backdrop-blur-xl md:px-10 md:py-8">
              <div className="flex items-center gap-3">
                <Image
                  src="/logo.avif"
                  alt="Hello.World Consulting logo"
                  width={32}
                  height={32}
                  className="h-8 w-8 rounded-full object-cover object-center"
                />
                <span className="text-lg font-semibold text-rose-text">A product of <span className="font-bold text-rose-foam">Hello.World Consulting</span></span>
              </div>
              <div className="text-sm italic text-rose-subtle">Made by Jonathan Reed</div>
              <div className="flex flex-col gap-2">
                <a href="https://helloworldfirm.com" className="flex items-center gap-2 font-medium text-rose-foam transition hover:underline" target="_blank" rel="noopener noreferrer">
                  <Image
                    src="/logo.avif"
                    alt="Hello.World Consulting logo"
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full object-cover object-center"
                  />
                  helloworldfirm.com
                </a>
                <a href="https://JonathanRReed.com" className="flex items-center gap-2 font-medium text-rose-foam transition hover:underline" target="_blank" rel="noopener noreferrer">
                  <Image
                    src="/jonathan.avif"
                    alt="Jonathan Reed"
                    width={20}
                    height={20}
                    className="h-5 w-5 rounded-full border-2 border-rose-highlightMed object-cover object-center"
                  />
                  JonathanRReed.com
                </a>
              </div>
              <div className="mt-2 text-xs text-rose-muted">2025 &copy; All Rights Reserved</div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
