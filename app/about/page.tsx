'use client';

export default function AboutPage() {
  const highlights = [
    { title: 'Token planning', body: 'Paste a prompt, pick a model, switch tokenizers, and see live token counts plus estimated cost before you send.' },
    { title: 'Format comparison', body: 'Render the same prompt as TOON, JSON (pretty/compact), YAML, XML, and CSV, then copy what you need.' },
    { title: 'Themes', body: 'Rosé Pine Night and Dawn, with stained-glass styling tuned for legibility on both.' },
  ];

  const links = [
    { label: 'TOON spec', href: 'https://github.com/toon-format/toon' },
    { label: 'YAML 1.2.2', href: 'https://yaml.org/spec/1.2.2/' },
    { label: 'RFC 8259 (JSON)', href: 'https://www.rfc-editor.org/info/rfc8259' },
    { label: 'XML 1.1 (W3C)', href: 'https://www.w3.org/TR/xml11/' },
    { label: 'RFC 4180 (CSV)', href: 'https://www.rfc-editor.org/rfc/rfc4180' },
    { label: 'OpenAPI 3.1', href: 'https://spec.openapis.org/oas/latest.html' },
    { label: 'JSON Schema 2020-12', href: 'https://json-schema.org/draft/2020-12/schema' },
  ];

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 sm:gap-10 px-4 sm:px-6 py-10 sm:py-14">
        <header className="space-y-3 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-iris">About</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-rose-text leading-tight">
            Prompt Info in one place.
          </h1>
          <p className="text-sm sm:text-base text-rose-subtle max-w-3xl mx-auto leading-relaxed">
            A Rosé Pine-themed toolkit to measure tokens and cost, compare formats, and ship prompts with confidence.
          </p>
        </header>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-3">
          {highlights.map(item => (
            <div
              key={item.title}
              className="glass-card rounded-2xl border border-rose-highlightMed/60 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)]"
            >
              <h2 className="text-base sm:text-lg font-semibold text-rose-text">{item.title}</h2>
              <p className="mt-2 text-sm text-rose-subtle leading-relaxed">{item.body}</p>
            </div>
          ))}
        </section>

        <section className="glass-card rounded-2xl border border-rose-highlightMed/60 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)]">
          <h3 className="text-sm font-semibold text-rose-text mb-2">Links & references</h3>
          <div className="grid gap-2 sm:gap-3 sm:grid-cols-2">
            {links.map(link => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-rose-foam hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        </section>

        <section className="glass-card rounded-2xl border border-rose-highlightMed/60 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)]">
          <h3 className="text-sm font-semibold text-rose-text mb-2">Notes</h3>
          <ul className="list-disc list-inside text-sm text-rose-subtle space-y-1.5">
            <li>Token counts use gpt-tokenizer; you can switch between common tokenizers.</li>
            <li>Model pricing is sourced from your Supabase dataset or local fallback JSON.</li>
            <li>Light/Dawn theme is tuned for legibility with softened glass backgrounds.</li>
          </ul>
        </section>
      </main>
    </div>
  );
}
