import '../styles/globals.css'
import { ReactNode } from 'react'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ThemeProvider } from '../components/ThemeProvider'
import ThemeSelector from '../components/ThemeSelector'
import Navigation from '../components/Navigation'
import { themes } from '../lib/themes'

export const metadata: Metadata = {
  metadataBase: new URL('https://prompt-info.helloworldfirm.com'),
  title: {
    default: 'Prompt Info - LLM Token Counter & Cost Calculator',
    template: '%s | Prompt Info'
  },
  description: 'Analyze LLM prompts with real-time token counting and accurate cost estimation across 1000+ models. Built for developers and AI engineers.',
  keywords: [
    'LLM token counter',
    'GPT tokenizer',
    'prompt cost calculator',
    'BPE tokenizer',
    'token visualization',
    'LLM cost estimation',
    'prompt analysis',
    'GPT token count',
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
    description: 'Analyze LLM prompts with real-time token counting and cost estimation across 1000+ models.',
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
    description: 'Analyze LLM prompts with real-time token counting and cost estimation.',
    creator: '@JonathanRReed',
    images: ['/logo.avif'],
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com',
  },
  category: 'Technology',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  const themeBootstrap = `
    (function() {
      try {
        const themes = ${JSON.stringify(themes)};
        const stored = localStorage.getItem('rose-pine-theme');
        const theme = stored && themes[stored] ? stored : 'night';
        const definition = themes[theme] || themes.night;
        Object.entries(definition.colors).forEach(([key, value]) => {
          document.documentElement.style.setProperty('--color-rose-' + key, value);
        });
        document.documentElement.setAttribute('data-theme', definition.mode);
        document.documentElement.setAttribute('data-theme-name', theme);
      } catch (e) {}
    })();
  `;

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
    description: 'Analyze LLM prompts with real-time token counting and accurate cost estimation across 1000+ models.',
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
    keywords: 'LLM token counter, GPT tokenizer, prompt cost calculator, BPE tokenizer',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.9',
      reviewCount: 18,
      ratingCount: 18,
      bestRating: '5',
      worstRating: '1',
    },
    review: [
      {
        '@type': 'Review',
        author: {
          '@type': 'Person',
          name: 'Internal user survey',
        },
        reviewBody:
          'Prompt Info streamlines our prompt engineering workflow with precise token counts and transparent cost breakdowns.',
        reviewRating: {
          '@type': 'Rating',
          ratingValue: '5',
          bestRating: '5',
          worstRating: '1',
        },
        datePublished: '2025-08-15',
      },
    ],
  };

  return (
    <html lang="en" className="m-0 p-0">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4efe4" media="(prefers-color-scheme: light)" />
        <link rel="preconnect" href="https://bgbqdzmgxkwstjihgeef.supabase.co" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/Favicon/favicon-96x96.avif" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.avif" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: themeBootstrap,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="m-0 min-h-screen bg-rose-base p-0 font-sans text-rose-text antialiased">
        <ThemeProvider>
          <div className="relative m-0 flex min-h-screen flex-col overflow-hidden p-0">
            <div className="page-bg" aria-hidden="true" />
            <div className="grid-overlay" aria-hidden="true" />
            <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-rose-highlightMed bg-rose-base px-3 py-3 sm:px-6">
              <Navigation />
              <ThemeSelector />
            </header>
            <main className="relative z-10 m-0 flex flex-1 flex-col items-center justify-center bg-transparent p-0">
              {children}
            </main>
            <footer className="relative z-10 w-full border-t border-rose-highlightMed bg-rose-base">
              <div className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                <div className="bg-rose-base p-5 sm:p-8 md:p-10">
                  <div className="flex items-center gap-4">
                    <Image
                      src="/logo.avif"
                      alt="Hello.World Consulting logo"
                      width={36}
                      height={36}
                      className="h-9 w-9 border border-rose-highlightMed object-cover object-center grayscale"
                    />
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-rose-muted">Product / Hello.World Consulting</p>
                      <p className="mt-1 text-sm font-semibold text-rose-text">Made by Jonathan Reed</p>
                    </div>
                  </div>
                  <p className="mt-8 max-w-3xl text-sm leading-7 text-rose-subtle">
                    Prompt Info is a compact utility for token counts, cost estimates, and prompt format checks before sending model requests.
                  </p>
                </div>
                <div className="grid gap-px bg-rose-highlightMed">
                  {[
                    ['Format lab', '/format-comparison/'],
                    ['Hello.World Consulting', 'https://helloworldfirm.com'],
                    ['Jonathan Reed', 'https://JonathanRReed.com'],
                  ].map(([label, href]) => (
                    <a
                      key={href}
                      href={href}
                      className="flex min-h-20 items-end bg-rose-base p-5 font-mono text-xs font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
                      target={href.startsWith('http') ? '_blank' : undefined}
                      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {label}
                    </a>
                  ))}
                </div>
              </div>
              <div className="mx-auto flex w-full max-w-[1500px] items-center justify-between border-x border-rose-highlightMed px-5 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-rose-muted sm:px-8">
                <span>2025 Copyright. All rights reserved.</span>
                <span>Token and cost planning</span>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
