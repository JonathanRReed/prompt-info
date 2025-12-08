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
    <div className="glass-card w-full rounded-2xl sm:rounded-3xl shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)] p-5 sm:p-7 backdrop-blur-2xl border border-rose-highlightMed/70">
      <header className="text-center mb-6">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-rose-iris mb-2">Tokenization</p>
        <h1 className="text-2xl sm:text-3xl font-bold text-rose-text">BPE Token Visualizer</h1>
        <p className="mt-2 text-sm text-rose-subtle">See how text is broken into tokens using Byte Pair Encoding</p>
      </header>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] items-start">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-sm font-bold text-rose-text tracking-wide" htmlFor="bpe-prompt">
              Enter text to tokenize
            </label>
            <button
              onClick={() => setPrompt('')}
              className="text-xs font-semibold text-rose-iris hover:text-rose-foam transition-colors"
              aria-label="Clear input"
            >
              Clear
            </button>
          </div>
          <div className="rounded-2xl border border-rose-highlightMed/60 bg-black/45 backdrop-blur-xl shadow-inner">
            <PromptInput id="bpe-prompt" value={prompt} onChange={setPrompt} />
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-xl border border-rose-highlightMed bg-black/50 px-4 py-3">
              <div className="text-2xl font-bold text-rose-text tabular-nums">{prompt.length}</div>
              <div className="text-xs text-rose-subtle uppercase tracking-wide">Characters</div>
            </div>
            <div className="rounded-xl border border-rose-iris/50 bg-rose-iris/12 px-4 py-3">
              <div className="text-2xl font-bold text-rose-iris tabular-nums">{decodedTokens.length}</div>
              <div className="text-xs text-rose-subtle uppercase tracking-wide">Tokens</div>
            </div>
            <div className="rounded-xl border border-rose-highlightMed bg-black/50 px-4 py-3">
              <div className="text-2xl font-bold text-rose-text tabular-nums">{stats?.ratio ?? '0.00'}</div>
              <div className="text-xs text-rose-subtle uppercase tracking-wide">Tokens / char</div>
            </div>
          </div>
          <div className="rounded-2xl border border-rose-highlightMed bg-black/35 backdrop-blur-xl p-4 text-rose-subtle text-sm">
            <p className="font-semibold text-rose-text mb-2">Tips:</p>
            <ul className="space-y-1.5 list-disc list-inside">
              <li>Whitespace and newlines become their own tokens—trim them if they are noisy.</li>
              <li>Repeated prefixes inflate token count; rewrite to reduce repetition.</li>
              <li>Watch multi-character tokens; they indicate good compression.</li>
            </ul>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-rose-highlightHigh/70 bg-[rgba(12,10,16,0.72)] backdrop-blur-2xl shadow-[0_30px_90px_-60px_rgba(0,0,0,0.85)] p-4 sm:p-5 max-h-[70vh] overflow-hidden flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Live token breakdown</p>
            <span className="text-[11px] text-rose-subtle">{decodedTokens.length} tokens</span>
          </div>
          <div className="relative flex-1 overflow-hidden rounded-xl border border-rose-highlightMed/70">
            <div className="absolute inset-0 bg-gradient-to-b from-white/4 via-rose-surface/10 to-black/30 opacity-70 pointer-events-none mix-blend-screen" />
            <div className="absolute inset-0 backdrop-blur-lg" />
            <div className="relative max-h-[60vh] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-rose-highlightHigh scrollbar-track-black/50">
              {decodedTokens.length === 0 ? (
                <div className="text-sm text-rose-muted italic">Start typing to see tokens in real time.</div>
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {decodedTokens.map((tok, i) => (
                    <span
                      key={`${tok.id}-${i}`}
                      className="group relative flex flex-col items-center rounded-lg border border-rose-highlightMed/80 bg-rose-highlightLow/70 px-3 py-2 text-[13px] font-mono text-rose-subtle transition-all hover:scale-105 hover:border-rose-iris hover:bg-rose-highlightMed/80"
                      title={`Token #${i + 1}\nID: ${tok.id}`}
                    >
                      <span className="leading-tight font-semibold text-rose-text group-hover:text-rose-foam transition-colors">
                        {tok.str || <span className="text-rose-muted">[space]</span>}
                      </span>
                      <span className="text-[10px] text-rose-muted group-hover:text-rose-subtle transition-colors">#{tok.id}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
