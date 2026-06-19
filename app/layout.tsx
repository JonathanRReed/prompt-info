import '../styles/globals.css'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
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
  description: 'Count prompt tokens and estimate request costs across hundreds of live-priced LLM models, right in the browser.',
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
    { name: 'Jonathan R. Reed', url: 'https://jonathanrreed.com' },
    { name: 'Hello.World Consulting', url: 'https://helloworldfirm.com' }
  ],
  creator: 'Jonathan R. Reed',
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
    url: 'https://prompt-info.helloworldfirm.com/',
    siteName: 'Prompt Info',
    title: 'Prompt Info - LLM Token Counter & Cost Calculator',
    description: 'Count prompt tokens and estimate request costs across hundreds of live-priced LLM models.',
    images: [
      {
        url: '/prompt_info_assets/prompt-info-logo-normal-1200w.png',
        width: 1200,
        height: 630,
        alt: 'Prompt Info - LLM Analysis Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prompt Info - LLM Token Counter & Cost Calculator',
    description: 'Count prompt tokens and estimate request costs before the model runs.',
    creator: '@JonathanRReed',
    images: ['/prompt_info_assets/prompt-info-logo-normal-1200w.png'],
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/',
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
    '@type': 'WebSite',
    name: 'Prompt Info',
    description: 'Count prompt tokens and estimate request costs across hundreds of live-priced LLM models, right in the browser.',
    url: 'https://prompt-info.helloworldfirm.com/',
    author: {
      '@type': 'Person',
      name: 'Jonathan R. Reed',
      url: 'https://jonathanrreed.com',
      sameAs: [
        'https://jonathanrreed.com/',
        'https://github.com/JonathanRReed',
        'https://helloworldfirm.com/',
      ],
    },
    publisher: {
      '@type': 'Organization',
      name: 'Hello.World Consulting',
      url: 'https://helloworldfirm.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://prompt-info.helloworldfirm.com/prompt_info_assets/prompt-info-logo-normal-1200w.png',
      },
    },
    inLanguage: 'en-US',
    keywords: 'LLM token counter, GPT tokenizer, prompt cost calculator, BPE tokenizer',
  };

  return (
    <html lang="en" className="m-0 p-0" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        <meta name="theme-color" content="#0a0a0a" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#f4efe4" media="(prefers-color-scheme: light)" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon-180x180.png" />
        <link rel="manifest" href="/site.webmanifest" />
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
          <div className="relative m-0 flex min-h-screen flex-col overflow-x-hidden p-0">
            <div className="page-bg" aria-hidden="true" />
            <div className="grid-overlay" aria-hidden="true" />
            <header className="sticky top-0 z-50 flex w-full items-center justify-between border-b border-rose-highlightMed bg-rose-base px-3 py-3 sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <Link href="/" className="flex shrink-0 items-center" aria-label="Prompt Info home">
                  <Image
                    src="/prompt_info_assets/prompt-info-logo-normal-600w.png"
                    alt="Prompt Info"
                    width={256}
                    height={64}
                    className="h-8 w-auto"
                    priority
                  />
                </Link>
                <Navigation />
              </div>
              <ThemeSelector />
            </header>
            <div className="relative z-10 m-0 flex flex-1 flex-col items-center justify-center bg-transparent p-0">
              {children}
            </div>
            <footer className="relative z-10 w-full border-t border-rose-highlightMed bg-rose-base">
              <div className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px md:grid-cols-[minmax(0,1fr)_minmax(300px,420px)]">
                <div className="bg-rose-base p-5 sm:p-8 md:p-10">
                  <div className="flex items-center gap-4">
                    <Link href="/" className="flex shrink-0 items-center" aria-label="Prompt Info home">
                      <Image
                        src="/prompt_info_assets/prompt-info-logo-footer-600w.png"
                        alt="Prompt Info"
                        width={288}
                        height={72}
                        className="h-10 w-auto"
                        loading="eager"
                      />
                    </Link>
                    <div>
                      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-rose-muted">
                        Product /{' '}
                        <a
                          href="https://helloworldfirm.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition duration-200 hover:text-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
                        >
                          Hello.World Consulting
                        </a>
                      </p>
                      <p className="mt-1 text-sm font-semibold text-rose-text">
                        Made by{' '}
                        <a
                          href="https://jonathanrreed.com/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="transition duration-200 hover:text-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
                        >
                          Jonathan R. Reed
                        </a>
                      </p>
                    </div>
                  </div>
                  <p className="mt-8 max-w-3xl text-sm leading-7 text-rose-subtle">
                    Prompt Info is a compact utility for token counts, cost estimates, and prompt format checks before sending model requests.
                  </p>
                </div>
                <div className="grid gap-px bg-rose-highlightMed">
                  {[
                    ['Format lab', '/format-comparison/'],
                    ['About Prompt Info', '/about/'],
                    ['Privacy policy', '/privacy/'],
                    ['Contact', '/contact/'],
                    ['Hello.World Consulting', 'https://helloworldfirm.com/'],
                    ['Jonathan R. Reed', 'https://jonathanrreed.com/'],
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
                <span>&copy; 2026 Hello.World Consulting</span>
                <span>Token and cost planning</span>
              </div>
            </footer>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
