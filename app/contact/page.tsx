import type { Metadata } from 'next';

const pageJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'ContactPage',
  name: 'Contact Prompt Info',
  url: 'https://prompt-info.helloworldfirm.com/contact/',
  datePublished: '2026-04-21',
  dateModified: '2026-04-21',
  author: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
  publisher: {
    '@type': 'Organization',
    name: 'Hello.World Consulting',
    url: 'https://helloworldfirm.com/',
  },
};

export const metadata: Metadata = {
  title: 'Contact Prompt Info',
  description:
    'Contact Hello.World Consulting about Prompt Info, token counting, prompt cost planning, bug reports, and AI workflow tooling requests.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/contact/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/contact/',
    title: 'Contact Prompt Info',
    description:
      'Contact Hello.World Consulting about Prompt Info, token counting, prompt cost planning, bug reports, and AI workflow tooling requests.',
    images: ['/logo.avif'],
  },
};

export default function ContactPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(pageJsonLd) }} />
      <section className="mx-auto grid min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-rose-love">Contact</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            Talk with the team behind Prompt Info.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Prompt Info is maintained by Hello.World Consulting. Reach out for product questions, bug reports, integration requests, or consulting work around prompt tooling, model evaluation, and AI application delivery.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            The fastest reports include what you were trying to estimate, the model or tokenizer selected, the browser used, and the result that looked off. For workflow discussions, describe the review process you want to improve and where cost or token planning currently slows the team down.
          </p>
          <p className="mt-6 max-w-3xl text-sm leading-7 text-rose-subtle sm:text-base">
            Clear context helps separate data corrections, interface bugs, and advisory requests. If the question is about adoption inside a team, share the role of the people reviewing requests, the approval step that needs evidence, and the kind of receipt or export that would make the decision easier.
          </p>
          <p className="mt-6 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
            By Hello.World Consulting. <time dateTime="2026-04-21">Updated April 21, 2026</time>.
          </p>
        </div>
        <aside className="bg-rose-base p-5 sm:p-8">
          <p className="data-label">Primary contact</p>
          <p className="mt-8 block break-words text-2xl font-black text-rose-text">
            hello [at] helloworldfirm [dot] com
          </p>
          <p className="mt-6 text-sm leading-7 text-rose-subtle">
            Include the page URL, browser, and a short description if you are reporting a tool issue.
          </p>
          <p className="mt-6 text-sm leading-7 text-rose-subtle">
            For pricing corrections, include the model name, provider page, expected token price, and the date you checked the source. For product questions, include the workflow you are trying to support and whether the request is about token counts, cost planning, or prompt format review.
          </p>
          <p className="mt-6 text-sm leading-7 text-rose-subtle">
            Do not include private API keys, customer data, confidential transcripts, or unreleased product material in a support request. A short synthetic example is enough for most troubleshooting.
          </p>
          <p className="mt-6 text-sm leading-7 text-rose-subtle">
            If a correction affects a public model catalog, include the public source URL and the unit used by the provider. If a request is strategic, include the launch window, constraints, and what outcome would count as a useful recommendation.
          </p>
        </aside>
      </section>
      <section className="mx-auto grid w-full max-w-[1500px] gap-px bg-rose-highlightMed px-px pb-px md:grid-cols-3">
        {[
          ['Bug reports', 'Send the prompt size, selected tokenizer, model, browser, and exact result that looked wrong. Reproducible reports are easier to verify.'],
          ['Integration requests', 'Describe the target workflow, expected input format, and output you need from the token or cost planning utility.'],
          ['Consulting', 'For advisory or implementation work, include the project stage, stack, decision deadline, and the model providers under evaluation.'],
          ['Data corrections', 'Share the provider source, model identifier, pricing unit, observed value, expected value, and the date the provider page was checked.'],
        ].map(([title, body]) => (
          <article key={title} className="bg-rose-base p-5 sm:p-7">
            <h2 className="font-mono text-sm font-bold uppercase tracking-[0.16em] text-rose-text">{title}</h2>
            <p className="mt-6 text-sm leading-7 text-rose-subtle">{body}</p>
          </article>
        ))}
      </section>
    </main>
  );
}
