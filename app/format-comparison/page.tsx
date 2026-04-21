import type { Metadata } from 'next';
import FormatComparisonPageClient from './page-client';

export const metadata: Metadata = {
  title: 'Prompt Format Comparison Tool',
  description:
    'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
  alternates: {
    canonical: 'https://prompt-info.helloworldfirm.com/format-comparison/',
  },
  openGraph: {
    url: 'https://prompt-info.helloworldfirm.com/format-comparison/',
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into TOON, JSON, YAML, XML, and CSV examples to compare payload shape, readability, and token planning tradeoffs.',
    images: ['/logo.avif'],
  },
  twitter: {
    title: 'Prompt Format Comparison Tool',
    description:
      'Convert one prompt into common payload formats to compare readability and token planning tradeoffs.',
  },
};

export default function FormatComparisonPage() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto grid min-h-[52dvh] w-full max-w-[1500px] border-b border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_340px]">
        <div className="border-rose-highlightMed px-4 py-16 sm:px-6 md:border-r md:px-12 md:py-24">
          <p className="data-label text-rose-love">Format laboratory</p>
          <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
            One prompt. Six payload shells.
          </h1>
          <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
            Convert one prompt into TOON, JSON, compact JSON, YAML, XML, and CSV examples. The comparison helps teams choose payload formats that are readable, compact, and easy to inspect before model execution.
          </p>
        </div>
        <aside className="bg-rose-base p-5 sm:p-8">
          <p className="data-label">Formats covered</p>
          <ul className="mt-8 space-y-4 text-sm leading-7 text-rose-subtle">
            <li>TOON for compact structured prompts.</li>
            <li>JSON and compact JSON for API payloads.</li>
            <li>YAML, XML, and CSV for common exchange formats.</li>
          </ul>
        </aside>
      </section>

      <FormatComparisonPageClient />
    </main>
  );
}
