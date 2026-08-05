import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Page not found',
  description: 'That Prompt Info URL does not exist. Use the links here to reach the token planner, format lab, about, privacy, or contact pages.',
  robots: {
    index: false,
    follow: true,
  },
  alternates: {
    canonical: null,
  },
  openGraph: null,
  twitter: null,
};

const destinations: [string, string, string][] = [
  ['Token planner', '/', 'Count tokens and estimate request and session cost.'],
  ['Format lab', '/format-comparison/', 'Compare TOON, JSON, YAML, XML, and CSV payload shapes.'],
  ['About Prompt Info', '/about/', 'Product scope, methodology, and references.'],
  ['Privacy policy', '/privacy/', 'Data-boundary notes for prompt handling.'],
  ['Contact', '/contact/', 'Questions, bug reports, and pricing corrections.'],
];

export default function NotFound() {
  return (
    <main className="w-full max-w-full overflow-x-hidden">
      <section className="mx-auto min-h-[54dvh] w-full max-w-[1500px] border-b border-rose-highlightMed px-4 py-16 sm:px-6 md:px-12 md:py-24">
        <p className="data-label text-rose-love">Error 404</p>
        <h1 className="macro-heading mt-6 max-w-6xl text-[clamp(3rem,7vw,6.6rem)]">
          That page is not here.
        </h1>
        <p className="mt-8 max-w-3xl text-base leading-8 text-rose-subtle sm:text-lg">
          The URL you followed does not match a Prompt Info page. The links below cover everything the site publishes.
        </p>
        <div className="mt-10 grid gap-px bg-rose-highlightMed md:grid-cols-3">
          {destinations.map(([label, href, blurb]) => (
            <Link
              key={href}
              href={href}
              className="block bg-rose-base p-5 transition duration-200 hover:bg-rose-love focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none sm:p-6"
            >
              <span className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-rose-muted">
                {label}
              </span>
              <span className="mt-3 block text-sm leading-7 text-rose-subtle">{blurb}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
