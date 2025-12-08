import '../styles/globals.css'
import { ReactNode } from 'react'
import Image from 'next/image'
import type { Metadata } from 'next'
import { ThemeProvider } from '../components/ThemeProvider'
import ThemeSelector from '../components/ThemeSelector'
import Navigation from '../components/Navigation'

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
    <html lang="en" className="p-0 m-0 bg-black">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#000000" />
        <link rel="preconnect" href="https://bgbqdzmgxkwstjihgeef.supabase.co" />
        <link rel="icon" type="image/svg+xml" href="/Favicon/favicon.svg" />
        <link rel="alternate icon" type="image/png" href="/Favicon/favicon-96x96.png" />
        <link rel="apple-touch-icon" href="/Favicon/apple-touch-icon.png" />
        <link rel="manifest" href="/Favicon/site.webmanifest" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const theme = localStorage.getItem('rose-pine-theme') || 'night';
                  const themes = {
                    night: { base: '#191724', surface: '#1f1d2e', overlay: '#26233a', muted: '#6e6a86', subtle: '#908caa', text: '#e0def4', love: '#eb6f92', gold: '#f6c177', rose: '#ebbcba', pine: '#31748f', foam: '#9ccfd8', iris: '#c4a7e7', highlightLow: '#21202e', highlightMed: '#403d52', highlightHigh: '#524f67' },
                    moon: { base: '#232136', surface: '#2a273f', overlay: '#393552', muted: '#6e6a86', subtle: '#908caa', text: '#e0def4', love: '#eb6f92', gold: '#f6c177', rose: '#ea9a97', pine: '#3e8fb0', foam: '#9ccfd8', iris: '#c4a7e7', highlightLow: '#2a283e', highlightMed: '#44415a', highlightHigh: '#56526e' },
                    dawn: { base: '#faf4ed', surface: '#fffaf3', overlay: '#f2e9e1', muted: '#9893a5', subtle: '#797593', text: '#575279', love: '#b4637a', gold: '#ea9d34', rose: '#d7827e', pine: '#286983', foam: '#56949f', iris: '#907aa9', highlightLow: '#f4ede8', highlightMed: '#dfdad9', highlightHigh: '#cecacd' }
                  };
                  const colors = themes[theme];
                  Object.entries(colors).forEach(([key, value]) => {
                    document.documentElement.style.setProperty('--color-rose-' + key, value);
                  });
                } catch (e) {}
              })();
            `,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-screen bg-black p-0 m-0 font-sans text-rose-text antialiased">
        <ThemeProvider>
          <div className="flex min-h-screen flex-col p-0 m-0 relative overflow-hidden">
            <div className="page-bg" aria-hidden="true" />
            <div className="grid-overlay" aria-hidden="true" />
            <header className="sticky top-0 z-50 flex w-full items-center justify-between px-4 sm:px-6 py-3 sm:py-4 backdrop-blur-lg bg-black/30 border-b border-rose-highlightMed/30">
              <Navigation />
              <ThemeSelector />
            </header>
            <main className="relative flex flex-1 flex-col items-center justify-center bg-transparent p-0 m-0">
              {children}
            </main>
          <footer className="flex w-full flex-col items-center justify-center pb-8 sm:pb-12 px-4">
            <div className="glass-card mx-auto w-full max-w-5xl rounded-2xl sm:rounded-3xl border border-rose-highlightMed/60 px-6 py-6 sm:px-8 sm:py-7 md:px-10 md:py-8 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.9)] backdrop-blur-xl">
              <div className="flex flex-col gap-3 sm:gap-4">
                <div className="flex items-center gap-2.5 sm:gap-3">
                  <Image
                    src="/logo.avif"
                    alt="Hello.World Consulting logo"
                    width={32}
                    height={32}
                    className="h-7 w-7 sm:h-8 sm:w-8 rounded-full object-cover object-center"
                  />
                  <span className="text-base sm:text-lg font-semibold text-rose-text">A product of <span className="font-bold text-rose-foam">Hello.World Consulting</span></span>
                </div>
                <div className="text-xs sm:text-sm italic text-rose-subtle">Made by Jonathan Reed</div>

                <div className="grid gap-3 sm:gap-4 sm:grid-cols-[1.1fr_1fr] items-start">
                  <div className="flex flex-col gap-2">
                    <a href="https://helloworldfirm.com" className="flex items-center gap-2 text-sm sm:text-base font-medium text-rose-foam transition hover:underline" target="_blank" rel="noopener noreferrer">
                      <Image
                        src="/logo.avif"
                        alt="Hello.World Consulting logo"
                        width={20}
                        height={20}
                        className="h-5 w-5 rounded-full object-cover object-center"
                      />
                      helloworldfirm.com
                    </a>
                    <a href="https://JonathanRReed.com" className="flex items-center gap-2 text-sm sm:text-base font-medium text-rose-foam transition hover:underline" target="_blank" rel="noopener noreferrer">
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
                  <div className="flex flex-col gap-2 text-sm sm:text-base font-medium text-rose-foam">
                    <a className="hover:underline" href="https://ai-news.helloworldfirm.com" target="_blank" rel="noopener noreferrer">
                      AI News
                    </a>
                    <a className="hover:underline" href="https://aistats.jonathanrreed.com" target="_blank" rel="noopener noreferrer">
                      AI Stats
                    </a>
                  </div>
                </div>

                <div className="text-[10px] sm:text-xs text-rose-muted">2025 &copy; All Rights Reserved</div>
              </div>
            </div>
          </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
