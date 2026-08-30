'use client';

import { useEffect, useMemo, useState } from 'react';
import { usePromptScenario } from '../../components/ScenarioProvider';

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

const FORMAT_TOKENIZERS = [
  { key: 'o200k_base', label: 'o200k_base', description: 'GPT-4o, o-series, and GPT-5 style models' },
  { key: 'cl100k_base', label: 'cl100k_base', description: 'GPT-4, GPT-3.5, and compatible estimates' },
  { key: 'p50k_base', label: 'p50k_base', description: 'Codex and older code models' },
  { key: 'p50k_edit', label: 'p50k_edit', description: 'Legacy edit models' },
  { key: 'r50k_base', label: 'r50k_base', description: 'Legacy GPT-3 models' },
] as const;

type FormatTokenizerKey = typeof FORMAT_TOKENIZERS[number]['key'];

const FORMAT_TOKENIZER_IMPORTERS: Record<
  FormatTokenizerKey,
  () => Promise<{ encode: (text: string) => number[] }>
> = {
  o200k_base: () => import('gpt-tokenizer/encoding/o200k_base'),
  cl100k_base: () => import('gpt-tokenizer/encoding/cl100k_base'),
  p50k_base: () => import('gpt-tokenizer/encoding/p50k_base'),
  p50k_edit: () => import('gpt-tokenizer/encoding/p50k_edit'),
  r50k_base: () => import('gpt-tokenizer/encoding/r50k_base'),
};

function isFormatTokenizerKey(value: string | undefined): value is FormatTokenizerKey {
  return FORMAT_TOKENIZERS.some(tokenizer => tokenizer.key === value);
}

function formatInputCost(tokenCount: number, ratePerMillion: number) {
  const cost = tokenCount / 1_000_000 * ratePerMillion;
  return cost < 0.01 ? `$${cost.toFixed(6)}` : `$${cost.toFixed(4)}`;
}

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
  const { scenario } = usePromptScenario();
  const [prompt, setPrompt] = useState(() => scenario?.prompt || SAMPLE_PROMPT);
  const [selectedTokenizer, setSelectedTokenizer] = useState<FormatTokenizerKey>(() =>
    isFormatTokenizerKey(scenario?.tokenizer) ? scenario.tokenizer : 'o200k_base'
  );
  const [tokenizer, setTokenizer] = useState<TokenizerState>({ status: 'loading' });
  const cards = useMemo(() => buildFormats(prompt), [prompt]);

  useEffect(() => {
    if (scenario?.prompt) setPrompt(scenario.prompt);
    if (isFormatTokenizerKey(scenario?.tokenizer)) setSelectedTokenizer(scenario.tokenizer);
  }, [scenario?.prompt, scenario?.tokenizer]);

  useEffect(() => {
    let cancelled = false;
    setTokenizer({ status: 'loading' });
    FORMAT_TOKENIZER_IMPORTERS[selectedTokenizer]()
      .then(({ encode }) => {
        if (!cancelled) setTokenizer({ status: 'ready', encode });
      })
      .catch(() => {
        if (!cancelled) setTokenizer({ status: 'error' });
      });
    return () => {
      cancelled = true;
    };
  }, [selectedTokenizer]);

  // Counts derive in the same render pass as card content, so stats never lag
  // a keystroke behind what the cards display.
  const tokenCounts = useMemo(() => {
    if (tokenizer.status !== 'ready') return null;
    return Object.fromEntries(cards.map(card => [card.key, tokenizer.encode(card.content).length]));
  }, [cards, tokenizer]);

  const rawPromptTokens = tokenizer.status === 'ready' ? tokenizer.encode(prompt.trim() || SAMPLE_PROMPT).length : null;

  const minTokens = tokenCounts
    ? Math.min(...cards.map(card => tokenCounts[card.key] ?? Number.POSITIVE_INFINITY))
    : null;

  return (
    <>
      <section className="mx-auto w-full max-w-[1500px] border-b border-rose-highlightMed bg-rose-base p-4 sm:p-6 md:p-10">
        {scenario?.prompt && (
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border border-rose-highlightMed bg-rose-overlay px-4 py-3">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-love">
              Planner scenario loaded
            </span>
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-rose-muted">
              {scenario.model || 'Model not selected'} · {scenario.turns.toLocaleString()} {scenario.turns === 1 ? 'turn' : 'turns'}
            </span>
          </div>
        )}
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
        <div className="mt-4 grid gap-px bg-rose-highlightMed border border-rose-highlightMed md:grid-cols-[minmax(0,1fr)_minmax(260px,0.6fr)]">
          <div className="bg-rose-base p-4">
            <label className="data-label" htmlFor="format-tokenizer">Tokenizer</label>
            <select
              id="format-tokenizer"
              value={selectedTokenizer}
              onChange={event => setSelectedTokenizer(event.target.value as FormatTokenizerKey)}
              className="glass-select mt-2 min-h-11 w-full border px-3 font-mono text-sm font-bold text-rose-text focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love"
            >
              {FORMAT_TOKENIZERS.map(option => (
                <option key={option.key} value={option.key}>{option.label} · {option.description}</option>
              ))}
            </select>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-muted">
              Tokenized with {selectedTokenizer}
            </p>
          </div>
          <div className="bg-rose-base p-4">
            <p className="data-label">Raw prompt baseline</p>
            <output className="mt-2 block font-mono text-2xl font-black text-rose-love tabular-nums">
              {rawPromptTokens === null ? 'Counting…' : `${rawPromptTokens.toLocaleString()} tokens`}
            </output>
            <p className="mt-2 text-xs leading-5 text-rose-muted">Each card reports the extra wrapper tokens above this unformatted prompt.</p>
          </div>
        </div>
        <p className="mt-3 text-sm leading-6 text-rose-muted">
          Every card wraps the same payload structure, so the counts stay directly comparable. Pick the tokenizer that best approximates your target model.
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
          const wrapperTokens = tokens !== undefined && rawPromptTokens !== null
            ? Math.max(0, tokens - rawPromptTokens)
            : null;
          const inputCost = tokens !== undefined && scenario?.inputPerMillion !== null && scenario?.inputPerMillion !== undefined
            ? formatInputCost(tokens, scenario.inputPerMillion)
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
                {wrapperTokens !== null && <span className="text-rose-muted tabular-nums">+{wrapperTokens.toLocaleString()} wrapper tokens</span>}
                {isSmallest && <span className="text-rose-love">Fewest tokens</span>}
                {overhead !== null && <span className="text-rose-muted tabular-nums">+{overhead}% vs best</span>}
                {inputCost && <span className="text-rose-love tabular-nums">{inputCost} input</span>}
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
