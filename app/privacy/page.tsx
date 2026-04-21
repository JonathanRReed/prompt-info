import type { Metadata } from 'next';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebPage',
  name: 'Prompt Info Privacy Policy',
  url: 'https://prompt-info.helloworldfirm.com/privacy/',
  datePublished: '2026-04-21',
  dateModified: '2026-04-21',
  author: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
};

export const metadata: Metadata = {
  title: 'Prompt Info Privacy Policy',
  description:
    'Privacy notes for Prompt Info, covering prompt handling, browser processing, model pricing data, analytics, and support requests.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/privacy/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/privacy/',
    title: 'Prompt Info Privacy Policy',
    description:
      'Privacy notes for Prompt Info, covering prompt handling, browser processing, model pricing data, analytics, and support requests.',
    images: ['/logo.avif'],
  },
};

export default function PrivacyPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <p className="data-label text-rose-love">Privacy policy</p>
        <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
          Prompt Info is built for preflight prompt checks.
        </h1>
        <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
          This page explains the practical data boundaries for Prompt Info. The utility is designed for browser-based estimation, public model metadata, and support conversations, not for account management or long-term storage of private work.
        </p>
        <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
          Updated April 21, 2026 by Hello.World Consulting.
        </p>
        <div className="mt-10 grid gap-px bg-rose-highlightMed md:grid-cols-3">
          {[
            ['Prompt text', 'Prompt text is processed in the browser for token counting and format comparison. The app does not require an account.'],
            ['Pricing data', 'Model pricing and limits may be loaded through a same-origin pricing API or static fallback catalog.'],
            ['Contact', 'Privacy questions can be sent to hello [at] helloworldfirm [dot] com.'],
            ['Sensitive material', 'Avoid entering private credentials, confidential customer data, or unreleased product material into any public planning utility.'],
          ].map(([title, body]) => (
            <article key={title} className="bg-rose-base p-5 sm:p-7">
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{title}</h2>
              <p className="mt-6 text-sm leading-7 text-rose-subtle">{body}</p>
            </article>
          ))}
        </div>
        <div className="mt-px grid gap-px bg-rose-highlightMed md:grid-cols-2">
          {[
            ['No account profile', 'Prompt Info does not ask visitors to create an account, submit payment details, or store private model credentials. Keep sensitive prompts, API keys, and customer data out of public browser tools unless your own policy allows that use.'],
            ['Operational data', 'Basic site delivery may involve normal hosting logs, browser requests, and pricing or model metadata requests. These records are used to operate the site and evaluate issues, not to build visitor accounts.'],
            ['Support requests', 'When you contact Hello.World Consulting, include only the details needed to reproduce the issue or discuss the workflow. Synthetic examples are preferred for troubleshooting.'],
            ['Third-party references', 'External documentation links and provider references are included for review context. Those destinations are governed by their own policies and availability.'],
          ].map(([title, body]) => (
            <article key={title} className="bg-rose-base p-5 sm:p-7">
              <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{title}</h2>
              <p className="mt-6 text-sm leading-7 text-rose-subtle">{body}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
