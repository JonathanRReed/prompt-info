'use client';

import { useEffect, useMemo, useState } from 'react';

const SAMPLE_PROMPT = 'Summarize the latest product launch in 3 bullet points.';

type FormatCard = {
  key: string;
  label: string;
  description: string;
  content: string;
};

type TokenizerState =
  | { status: 'loading' }
  | { status: 'ready'; encode: (text: string) => number[] }
  | { status: 'error' };

function yamlScalar(value: string) {
  // Quote when YAML would otherwise misparse the scalar: special punctuation,
  // control whitespace (the textarea allows newlines/tabs), or scalars YAML
  // would type-coerce (true/no/null/numbers). JSON strings are valid YAML 1.2
  // double-quoted scalars, so JSON.stringify round-trips safely.
  if (/[:#?[\]{}&*!|>'"%@`\t\n\r]|^[\s-]|\s$|^$/.test(value)) return JSON.stringify(value);
  if (/^(?:true|false|null|~|yes|no|on|off|[-+]?(?:\d[\d_]*\.?\d*(?:[eE][-+]?\d+)?|\.\d+))$/i.test(value)) {
    return JSON.stringify(value);
  }
  return value;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Every format encodes the exact same structure so the token comparison is
// fair: { prompt, messages: [{id, role}...], meta: { source, format } }. The
// small array is what separates TOON's length-marked tabular syntax from
// plain YAML.
function buildFormats(prompt: string): FormatCard[] {
  const clean = prompt.trim() || SAMPLE_PROMPT;
  const messages = [
    { id: 1, role: 'system' },
    { id: 2, role: 'user' },
  ];
  const data = {
    prompt: clean,
    messages,
    meta: {
      source: 'prompt-info',
      format: 'comparison',
    },
  };

  const toon = [
    `prompt: ${yamlScalar(clean)}`,
    `messages[${messages.length}]{id,role}:`,
    ...messages.map(m => `  ${m.id},${m.role}`),
    'meta:',
    '  source: prompt-info',
    '  format: comparison',
  ].join('\n');
  const jsonPretty = JSON.stringify(data, null, 2);
  const jsonCompact = JSON.stringify(data);
  const yaml = [
    `prompt: ${yamlScalar(clean)}`,
    'messages:',
    ...messages.flatMap(m => [`  - id: ${m.id}`, `    role: ${m.role}`]),
    'meta:',
    '  source: prompt-info',
    '  format: comparison',
  ].join('\n');
  const xml = [
    '<root>',
    `  <prompt>${xmlEscape(clean)}</prompt>`,
    '  <messages>',
    ...messages.map(m => `    <message id="${m.id}" role="${m.role}" />`),
    '  </messages>',
    '  <meta>',
    '    <source>prompt-info</source>',
    '    <format>comparison</format>',
    '  </meta>',
    '</root>',
  ].join('\n');
  const csv = [
    'field,value',
    `prompt,"${clean.replace(/"/g, '""')}"`,
    ...messages.map(m => `message_${m.id}_role,${m.role}`),
    'meta_source,prompt-info',
    'meta_format,comparison',
  ].join('\n');

  return [
    { key: 'toon', label: 'TOON', description: 'Token-oriented notation, tabular arrays', content: toon },
    { key: 'json', label: 'JSON', description: 'Readable JSON', content: jsonPretty },
    { key: 'json-compact', label: 'JSON compact', description: 'Minified JSON', content: jsonCompact },
    { key: 'yaml', label: 'YAML', description: 'Common config format', content: yaml },
    { key: 'xml', label: 'XML', description: 'Tagged data', content: xml },
    { key: 'csv', label: 'CSV', description: 'Flat rows (nested keys get flattened)', content: csv },
  ];
}

export default function FormatComparisonPageClient() {
  const [prompt, setPrompt] = useState(SAMPLE_PROMPT);
  const [tokenizer, setTokenizer] = useState<TokenizerState>({ status: 'loading' });
  const cards = useMemo(() => buildFormats(prompt), [prompt]);

  useEffect(() => {
    let cancelled = false;
    import('gpt-tokenizer/esm/encoding/o200k_base')
      .then(({ encode }) => {
        if (!cancelled) setTokenizer({ status: 'ready', encode });
      })
      .catch(() => {
        if (!cancelled) setTokenizer({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Counts derive in the same render pass as card content, so stats never lag
  // a keystroke behind what the cards display.
  const tokenCounts = useMemo(() => {
    if (tokenizer.status !== 'ready') return null;
    return Object.fromEntries(cards.map(card => [card.key, tokenizer.encode(card.content).length]));
  }, [cards, tokenizer]);

  const minTokens = tokenCounts
    ? Math.min(...cards.map(card => tokenCounts[card.key] ?? Number.POSITIVE_INFINITY))
    : null;

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
        <p className="mt-3 text-sm leading-6 text-rose-muted">
          Every card wraps the same payload structure, tokenized with o200k_base, so the counts are directly comparable.
        </p>
      </section>

      <section className="mx-auto grid w-full max-w-[1500px] grid-flow-dense gap-px bg-rose-highlightMed px-px pb-px lg:grid-cols-2">
        {cards.map(card => {
          const tokens = tokenCounts?.[card.key];
          const bytes = new TextEncoder().encode(card.content).length;
          const isSmallest = tokens !== undefined && minTokens !== null && tokens === minTokens;
          const overhead = tokens !== undefined && minTokens !== null && minTokens > 0 && !isSmallest
            ? Math.round(((tokens - minTokens) / minTokens) * 100)
            : null;

          return (
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
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-rose-highlightMed px-4 py-2 font-mono text-[11px] uppercase tracking-[0.14em] sm:px-5">
                <span className="font-bold text-rose-text tabular-nums">
                  {tokens !== undefined
                    ? `${tokens.toLocaleString()} tokens`
                    : tokenizer.status === 'error' ? 'tokens unavailable' : 'counting…'}
                </span>
                <span className="text-rose-muted tabular-nums">{bytes.toLocaleString()} bytes</span>
                {isSmallest && <span className="text-rose-love">Fewest tokens</span>}
                {overhead !== null && <span className="text-rose-muted tabular-nums">+{overhead}% vs best</span>}
              </div>
              <pre className="min-h-[180px] flex-1 overflow-x-auto whitespace-pre-wrap break-words p-4 font-mono text-[13px] leading-7 text-rose-subtle sm:p-5">
                {card.content}
              </pre>
            </article>
          );
        })}
      </section>
    </>
  );
}
