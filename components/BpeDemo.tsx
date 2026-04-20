'use client';

import { useMemo, useState } from 'react';
import PromptInput from './PromptInput';
import { encode, decode } from 'gpt-tokenizer';

type DecodedToken = {
  id: number;
  str: string;
};

export default function BpeDemo() {
  const [prompt, setPrompt] = useState('');

  const decodedTokens = useMemo<DecodedToken[]>(() => {
    if (!prompt.trim()) return [];
    const tks = encode(prompt);
    return tks.map(id => ({ id, str: decode([id]) }));
  }, [prompt]);

  const stats = useMemo(() => {
    if (!decodedTokens.length) return null;
    const chars = prompt.length;
    const tokens = decodedTokens.length;
    const ratio = chars > 0 ? (tokens / chars).toFixed(2) : '0';
    return { chars, tokens, ratio };
  }, [decodedTokens, prompt]);

  return (
    <section className="grid w-full gap-px bg-rose-highlightMed border border-rose-highlightMed lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <div className="bg-rose-base p-5 sm:p-7">
        <header className="mb-6">
          <p className="data-label text-rose-love">Tokenization</p>
          <h1 className="mt-3 text-3xl font-black uppercase leading-none tracking-[-0.05em] text-rose-text sm:text-4xl">
            BPE token visualizer
          </h1>
          <p className="mt-3 text-sm leading-6 text-rose-subtle">See how text breaks into byte pair encoded token units.</p>
        </header>

        <div className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <label className="data-label" htmlFor="bpe-prompt">
              Text to tokenize
            </label>
            <button
              onClick={() => setPrompt('')}
              className="min-h-11 border border-rose-highlightMed bg-rose-base px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
              aria-label="Clear input"
            >
              Clear
            </button>
          </div>
          <PromptInput id="bpe-prompt" value={prompt} onChange={setPrompt} />
          <div className="grid gap-px bg-rose-highlightMed sm:grid-cols-3">
            {[
              ['Characters', prompt.length],
              ['Tokens', decodedTokens.length],
              ['Tokens per char', stats?.ratio ?? '0.00'],
            ].map(([label, value]) => (
              <div key={label} className="bg-rose-base p-4 text-center">
                <div className="font-mono text-3xl font-bold text-rose-text tabular-nums">{value}</div>
                <div className="mt-2 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-muted">{label}</div>
              </div>
            ))}
          </div>
          <div className="border border-rose-highlightMed bg-rose-base p-4 text-sm leading-7 text-rose-subtle">
            <p className="font-mono text-xs font-bold uppercase tracking-[0.14em] text-rose-text">Notes</p>
            <ul className="mt-3 space-y-1.5">
              <li>Whitespace and newlines can become their own tokens, trim them if they are noisy.</li>
              <li>Repeated prefixes inflate token count. Rewrite repeated instructions when possible.</li>
              <li>Multi-character tokens indicate better compression.</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex min-h-[520px] flex-col gap-3 bg-rose-base p-5 sm:p-7">
        <div className="flex items-center justify-between gap-4">
          <p className="data-label">Live token breakdown</p>
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-rose-muted">{decodedTokens.length} tokens</span>
        </div>
        <div className="flex-1 overflow-y-auto border border-rose-highlightMed bg-rose-surface p-3">
          {decodedTokens.length === 0 ? (
            <div className="p-4 text-sm text-rose-muted">Start typing to see tokens in real time.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {decodedTokens.map((tok, i) => (
                <span
                  key={`${tok.id}-${i}`}
                  className="token-chip group"
                  title={`Token #${i + 1}\nID: ${tok.id}`}
                >
                  <span className="text-rose-text group-hover:text-white">{tok.str || '[space]'}</span>
                  <span className="text-rose-muted group-hover:text-rose-text">#{tok.id}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
