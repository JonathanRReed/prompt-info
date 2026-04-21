import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact Prompt Info',
  description:
    'Contact Hello.World Consulting about Prompt Info, token counting, prompt cost planning, AI developer tooling, bug reports, and integration requests for model workflow teams.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/contact/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/contact/',
    title: 'Contact Prompt Info',
    description:
      'Contact Hello.World Consulting about Prompt Info, token counting, prompt cost planning, AI developer tooling, bug reports, and integration requests for model workflow teams.',
    images: ['/logo.avif'],
  },
};

export default function ContactPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto grid min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_360px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-rose-love">Contact</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            Talk with the team behind Prompt Info.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Prompt Info is maintained by Hello.World Consulting. Reach out for product questions, bug reports, integration requests, or consulting work around prompt tooling, model evaluation, and AI application delivery.
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
        </aside>
      </section>
    </main>
  );
}
