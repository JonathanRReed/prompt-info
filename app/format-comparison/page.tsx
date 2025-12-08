'use client';

import { useMemo, useState } from 'react';

const SAMPLE_PROMPT = 'Summarize the latest product launch in 3 bullet points.';

function buildFormats(prompt: string) {
  const clean = prompt.trim() || SAMPLE_PROMPT;
  const data = {
    prompt: clean,
    meta: {
      source: 'prompt-info',
      format: 'comparison',
    },
  };

  const toon = `prompt:
  text: "${clean.replace(/"/g, '\\"')}"
meta:
  source: "prompt-info"
  format: "comparison"`;

  const jsonPretty = JSON.stringify(data, null, 2);
  const jsonCompact = JSON.stringify(data);

  const yaml = `prompt:
  text: ${clean}
meta:
  source: prompt-info
  format: comparison`;

  const xml = `<root>
  <prompt>
    <text>${clean}</text>
  </prompt>
  <meta>
    <source>prompt-info</source>
    <format>comparison</format>
  </meta>
</root>`;

  const csv = `field,value
prompt,"${clean.replace(/"/g, '""')}"
meta_source,prompt-info
meta_format,comparison`;

  return [
    { key: 'toon', label: 'TOON', description: 'Structured text (example)', content: toon },
    { key: 'json', label: 'JSON', description: 'Readable JSON', content: jsonPretty },
    { key: 'json-compact', label: 'JSON compact', description: 'Minified JSON', content: jsonCompact },
    { key: 'yaml', label: 'YAML', description: 'Common config format', content: yaml },
    { key: 'xml', label: 'XML', description: 'Tagged data', content: xml },
    { key: 'csv', label: 'CSV', description: 'Flat rows', content: csv },
  ];
}

export default function FormatComparisonPage() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const cards = useMemo(() => buildFormats(prompt), [prompt]);

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 sm:gap-10 px-4 sm:px-6 py-10 sm:py-14">
        <header className="space-y-4 text-center">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-rose-iris">Format comparison</p>
          <h1 className="text-3xl sm:text-4xl font-bold text-rose-text leading-tight">
            See your prompt in every common format.
          </h1>
          <p className="text-sm sm:text-base text-rose-subtle max-w-3xl mx-auto leading-relaxed">
            Enter text once; we render TOON, JSON (pretty and compact), YAML, XML, and CSV so you can copy the version you need.
          </p>
        </header>

        <section className="glass-card rounded-2xl sm:rounded-3xl border-2 border-rose-highlightHigh/60 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_30px_80px_-45px_rgba(0,0,0,0.7)] space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-sm font-semibold text-rose-text" htmlFor="format-prompt">
              Prompt
            </label>
            <span className="text-xs text-rose-muted">{prompt.length} chars</span>
          </div>
          <textarea
            id="format-prompt"
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder={SAMPLE_PROMPT}
            className="w-full min-h-[140px] rounded-xl border border-rose-highlightMed bg-black/40 backdrop-blur-xl p-4 text-sm text-rose-text placeholder:text-rose-muted/70 focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/30"
          />
        </section>

        <section className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          {cards.map(card => (
            <article
              key={card.key}
              className="glass-card rounded-2xl sm:rounded-3xl border border-rose-highlightMed/60 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)] flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-rose-muted mb-1">{card.label}</p>
                  <p className="text-sm text-rose-subtle">{card.description}</p>
                </div>
                <button
                  onClick={() => navigator.clipboard.writeText(card.content)}
                  className="glass-select rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-text hover:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/40 transition shrink-0"
                  aria-label={`Copy ${card.label} snippet`}
                >
                  Copy
                </button>
              </div>
              <pre className="rounded-xl border border-rose-highlightMed/60 bg-black/35 text-rose-text text-[13px] leading-relaxed overflow-x-auto whitespace-pre-wrap break-words p-3 sm:p-4 min-h-[110px]">
                {card.content}
              </pre>
            </article>
          ))}
        </section>

        <section className="glass-card rounded-2xl sm:rounded-3xl border border-rose-highlightMed/60 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_30px_80px_-50px_rgba(0,0,0,0.75)] space-y-2">
          <h2 className="text-sm font-semibold text-rose-text">About & references</h2>
          <p className="text-sm text-rose-subtle">
            This page shows your prompt rendered across common interchange formats so you can grab the shape you need.
          </p>
          <ul className="text-sm text-rose-subtle space-y-1.5">
            <li>
              TOON spec: <a className="text-rose-foam hover:underline" href="https://github.com/toon-format/toon" target="_blank" rel="noopener noreferrer">github.com/toon-format/toon</a>
            </li>
            <li>
              YAML: <a className="text-rose-foam hover:underline" href="https://yaml.org/spec/1.2.2/" target="_blank" rel="noopener noreferrer">YAML 1.2.2 spec</a>
            </li>
            <li>
              JSON: <a className="text-rose-foam hover:underline" href="https://www.rfc-editor.org/info/rfc8259" target="_blank" rel="noopener noreferrer">RFC 8259 (JSON)</a>
            </li>
            <li>
              XML: <a className="text-rose-foam hover:underline" href="https://www.w3.org/TR/xml11/" target="_blank" rel="noopener noreferrer">XML 1.1 (W3C)</a>
            </li>
            <li>
              CSV: <a className="text-rose-foam hover:underline" href="https://www.rfc-editor.org/rfc/rfc4180" target="_blank" rel="noopener noreferrer">RFC 4180 (CSV)</a>
            </li>
            <li>
              OpenAPI 3.1: <a className="text-rose-foam hover:underline" href="https://spec.openapis.org/oas/latest.html" target="_blank" rel="noopener noreferrer">spec.openapis.org/oas/latest.html</a>
            </li>
            <li>
              JSON Schema 2020-12: <a className="text-rose-foam hover:underline" href="https://json-schema.org/draft/2020-12/schema" target="_blank" rel="noopener noreferrer">json-schema.org/draft/2020-12/schema</a>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
