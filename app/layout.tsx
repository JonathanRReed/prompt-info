import '../styles/globals.css'
import { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ThemeProvider } from '../components/ThemeProvider'
import ThemeSelector from '../components/ThemeSelector'
import Navigation from '../components/Navigation'
import { ScenarioProvider } from '../components/ScenarioProvider'
import { OG_BASE, TWITTER_BASE } from '../lib/seo'

export const metadata: Metadata = {
  metadataBase: new URL('https://prompt-info.helloworldfirm.com'),
  title: {
    default: 'Prompt Info - AI Workload Cost Calculator',
    template: '%s | Prompt Info'
  },
  description: 'Compare request, session, monthly, and annual AI workload costs across current models without sending your prompt anywhere.',
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
  openGraph: {
    ...OG_BASE,
    url: 'https://prompt-info.helloworldfirm.com/',
    title: 'Prompt Info - AI Workload Cost Calculator',
    description: 'Compare request, session, monthly, and annual AI workload costs across current models.',
  },
  twitter: {
    ...TWITTER_BASE,
    title: 'Prompt Info - AI Workload Cost Calculator',
    description: 'Compare model costs for a real prompt, agent session, or recurring workload.',
  },
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/',
  },
  category: 'Technology',
}

const related = [
  { href: 'https://ai-news.helloworldfirm.com/', name: 'AI News', purpose: 'What changed in AI, from the original announcements.' },
  { href: 'https://aistats.jonathanrreed.com/', name: 'AI Stats', purpose: 'How models compare on price, speed, context, and named benchmarks.' },
  { href: 'https://ai-dragrace.jonathanrreed.com/', name: 'AI Drag Racing', purpose: 'How fast a model responds from your own connection.' },
  { href: 'https://polibench.jonathanrreed.com/', name: 'PoliBench', purpose: 'Where models land on political questions, and how stable that is.' },
]

export default function RootLayout({ children }: { children: ReactNode }) {
  // Runs before paint so neither theme flashes. Mirrors lib/themes.ts, including
  // the migration from the older six-way selector value.
  const themeBootstrap = `
    (function () {
      var theme = 'dark';
      try {
        var stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') theme = stored;
        else {
          var legacy = localStorage.getItem('rose-pine-theme');
          if (legacy === 'ledger' || legacy === 'blueprint' || legacy === 'clay') theme = 'light';
        }
      } catch (e) {}
      var root = document.documentElement;
      root.setAttribute('data-theme', theme);
      if (theme === 'light') root.classList.add('light');
      root.style.colorScheme = theme;
    })();
  `;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Prompt Info',
    description: 'Compare request, session, monthly, and annual AI workload costs without sending your prompt anywhere.',
    url: 'https://prompt-info.helloworldfirm.com/',
    author: {
      '@type': 'Person',
      name: 'Jonathan R. Reed',
      url: 'https://jonathanrreed.com',
      sameAs: [
        'https://jonathanrreed.com/',
        'https://github.com/JonathanRReed',
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

  const year = new Date().getFullYear();

  return (
    <html lang="en" className="m-0 p-0" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0a0a" />
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
        <link rel="preload" href="/fonts/nebula-sans/NebulaSans-Book.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/nebula-sans/NebulaSans-Bold.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/jetbrains-mono/JetBrainsMono-Variable.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="m-0 min-h-screen bg-rose-base p-0 font-sans text-rose-text antialiased">
        <ThemeProvider>
          <ScenarioProvider>
            <a href="#main-content" className="eco-skip">Skip to content</a>
            <div className="relative m-0 flex min-h-screen flex-col overflow-x-hidden p-0">
            <div className="page-bg" aria-hidden="true" />
            <div className="grid-overlay" aria-hidden="true" />
            <header className="eco-header">
              <div className="eco-container eco-header-inner">
                <Link href="/" className="eco-lockup" aria-label="Prompt Info home">
                  <svg className="eco-mark" viewBox="0 0 24 24" aria-hidden="true">
                    <rect x="3" y="3" width="4" height="4" fill="var(--ink-1)" />
                    <rect x="8" y="3" width="4" height="4" fill="var(--ink-1)" />
                    <rect x="3" y="8" width="4" height="4" fill="var(--ink-1)" />
                    <rect x="8" y="8" width="4" height="4" fill="var(--ink-1)" />
                    <rect x="3" y="13" width="4" height="4" fill="var(--ink-1)" />
                    <rect x="3" y="18" width="4" height="3" fill="var(--ink-1)" />
                    <rect x="14" y="8" width="4" height="13" fill="var(--signal)" />
                    <circle cx="16" cy="4.5" r="2.2" fill="var(--signal)" />
                  </svg>
                  <span className="eco-wordmark">Prompt Info</span>
                </Link>
                <Navigation />
                <div className="flex items-center gap-2">
                  <ThemeSelector />
                </div>
              </div>
            </header>
            <div className="relative z-10 m-0 flex flex-1 flex-col items-center justify-center bg-transparent p-0">
              {children}
            </div>
            <footer className="eco-footer">
              <div className="eco-container">
                <section className="eco-related" aria-labelledby="related-tools-heading">
                  <h2 id="related-tools-heading" className="eco-related-heading">Related tools by the same author</h2>
                  <div className="eco-related-grid">
                    <div className="eco-related-link" aria-current="true">
                      <strong>Prompt Info</strong>
                      <span>What a prompt or recurring workload costs.</span>
                    </div>
                    {related.map(site => (
                      <a key={site.href} href={site.href} className="eco-related-link" rel="noopener">
                        <strong>{site.name}</strong>
                        <span>{site.purpose}</span>
                      </a>
                    ))}
                  </div>
                </section>
                <div className="eco-footer-groups">
                  <nav className="eco-footer-group" aria-labelledby="footer-tools-heading">
                    <h2 id="footer-tools-heading">Tools</h2>
                    <ul>
                      <li><Link href="/">Cost calculator</Link></li>
                      <li><Link href="/format-comparison/">Format comparison</Link></li>
                      <li><Link href="/token-efficiency/">Cost per task</Link></li>
                    </ul>
                  </nav>
                  <nav className="eco-footer-group" aria-labelledby="footer-data-heading">
                    <h2 id="footer-data-heading">Data</h2>
                    <ul>
                      <li><a href="/api/pricing">Pricing catalog JSON</a></li>
                      <li><a href="/api/benchmarks">Benchmark catalog JSON</a></li>
                      <li><a href="https://openrouter.ai/docs/overview/models" target="_blank" rel="noopener noreferrer">OpenRouter model pricing</a></li>
                      <li><a href="https://artificialanalysis.ai/" target="_blank" rel="noopener noreferrer">Artificial Analysis benchmarks</a></li>
                    </ul>
                  </nav>
                  <nav className="eco-footer-group" aria-labelledby="footer-site-heading">
                    <h2 id="footer-site-heading">Site</h2>
                    <ul>
                      <li><Link href="/about/">About</Link></li>
                      <li><Link href="/contact/">Contact</Link></li>
                      <li><Link href="/privacy/">Privacy</Link></li>
                    </ul>
                  </nav>
                </div>
                <div className="eco-footer-meta">
                  <p>By <a href="https://jonathanrreed.com/" rel="author">Jonathan R. Reed</a>. Published by <a href="https://helloworldfirm.com/" rel="noopener">Hello.World Consulting</a>. Prompt text stays in your browser.</p>
                  <p>prompt-info.helloworldfirm.com &middot; {year}</p>
                </div>
              </div>
            </footer>
            </div>
          </ScenarioProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
