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

  const toon = `prompt:\n  text: "${clean.replace(/"/g, '\\"')}"\nmeta:\n  source: "prompt-info"\n  format: "comparison"`;
  const jsonPretty = JSON.stringify(data, null, 2);
  const jsonCompact = JSON.stringify(data);
  const yaml = `prompt:\n  text: ${clean}\nmeta:\n  source: prompt-info\n  format: comparison`;
  const xml = `<root>\n  <prompt>\n    <text>${clean}</text>\n  </prompt>\n  <meta>\n    <source>prompt-info</source>\n    <format>comparison</format>\n  </meta>\n</root>`;
  const csv = `field,value\nprompt,"${clean.replace(/"/g, '""')}"\nmeta_source,prompt-info\nmeta_format,comparison`;

  return [
    { key: 'toon', label: 'TOON', description: 'Structured text example', content: toon },
    { key: 'json', label: 'JSON', description: 'Readable JSON', content: jsonPretty },
    { key: 'json-compact', label: 'JSON compact', description: 'Minified JSON', content: jsonCompact },
    { key: 'yaml', label: 'YAML', description: 'Common config format', content: yaml },
    { key: 'xml', label: 'XML', description: 'Tagged data', content: xml },
    { key: 'csv', label: 'CSV', description: 'Flat rows', content: csv },
  ];
}

export default function FormatComparisonPageClient() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const cards = useMemo(() => buildFormats(prompt), [prompt]);

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] border-b border-rose-highlightMed bg-rose-base p-4 sm:p-6 md:p-10">
        <div className="flex items-center justify-between gap-4">
          <label className="data-label" htmlFor="format-prompt">
            Source prompt
          </label>
          <span className="font-mono text-[11px] uppercase tracking-[0.16em] text-rose-muted tabular-nums">{prompt.length} chars</span>
        </div>
        <textarea
          id="format-prompt"
          value={prompt}
          onChange={e => setPrompt(e.target.value)}
          placeholder={SAMPLE_PROMPT}
          className="mt-5 min-h-[180px] w-full border border-rose-highlightMed bg-rose-surface p-4 font-mono text-sm leading-7 text-rose-text placeholder:text-rose-muted transition duration-200 focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
        />
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] grid-flow-dense gap-px bg-rose-highlightMed px-px pb-px lg:grid-cols-2">
        {cards.map(card => (
          <article key={card.key} className="group flex min-h-[300px] flex-col bg-rose-base transition duration-300 hover:bg-rose-overlay motion-reduce:transition-none">
            <div className="flex items-start justify-between gap-3 border-b border-rose-highlightMed p-4 sm:p-5">
              <div>
                <h2 className="font-mono text-sm font-bold uppercase tracking-[0.18em] text-rose-text">{card.label}</h2>
                <p className="mt-2 text-sm text-rose-subtle">{card.description}</p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(card.content)}
                className="min-h-11 border border-rose-highlightMed bg-rose-base px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
                aria-label={`Copy ${card.label} snippet`}
              >
                Copy
              </button>
            </div>
            <pre className="min-h-[180px] flex-1 overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-7 text-rose-subtle sm:p-5">
              {card.content}
            </pre>
          </article>
        ))}
      </section>
    </>
  );
}
