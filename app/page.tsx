'use client';
import { useState, useEffect, useMemo } from 'react';
import PromptInput from '../components/PromptInput';
import ModelSelect from '../components/ModelSelect';
import { encode, decode } from 'gpt-tokenizer';
import { fetchPricing, PricingMap } from '../lib/fetchPricing';

const MAX_OUTPUT_TOKENS = 131072;
const DEFAULT_OUTPUT_TOKENS = 4096;
const REFERENCE_TOKEN_WINDOW = 4096;
const TOKEN_STEP = 64;

const TOKENIZERS = [
  { key: 'cl100k_base', label: 'Universal · cl100k_base (GPT-4/3.5 default)' },
  { key: 'o200k_base', label: 'o200k_base · GPT-4o large context' },
  { key: 'p50k_base', label: 'p50k_base · Davinci / code' },
  { key: 'r50k_base', label: 'r50k_base · Legacy GPT-3' },
] as const;

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [decodedTokens, setDecodedTokens] = useState<{str: string, id: number}[]>([]);
  const [cost, setCost] = useState<number | null>(null);
  const [inputCost, setInputCost] = useState<number | null>(null);
  const [outputCost, setOutputCost] = useState<number | null>(null);
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [expectedOutTokens, setExpectedOutTokens] = useState<number | null>(null);
  const [visualizerMode, setVisualizerMode] = useState<'snapshot' | 'tokens'>('snapshot');
  const [tokenizer, setTokenizer] = useState<typeof TOKENIZERS[number]['key']>('cl100k_base');

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchPricing();
        if (mounted) setPricing(data);
      } catch (e) {
        console.error('Failed to load pricing from Supabase', e);
        if (mounted) setPricing({});
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Build model list; if Supabase returned no models, fallback to static JSON
  useEffect(() => {
    let mounted = true;
    (async () => {
      setModelsLoading(true);
      try {
        const keys = pricing ? Object.keys(pricing) : [];
        if (keys.length > 0) {
          if (mounted) setAvailableModels(keys);
          return;
        }
        // Fallback to static JSON
        try {
          const res = await fetch('/data/llm-data.json');
          const json = await res.json();
          const staticKeys = Object.keys(json ?? {});
          if (mounted) setAvailableModels(staticKeys);
        } catch (err) {
          console.warn('Fallback to static model list failed:', err);
          if (mounted) setAvailableModels([]);
        }
      } finally {
        if (mounted) setModelsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [pricing]);

  // When model or pricing changes, initialize expectedOutTokens to the model's default if available
  useEffect(() => {
    if (!pricing || !model) {
      setExpectedOutTokens(null);
      return;
    }
    const entry = pricing[model];
    const defOut = Number(entry?.avgOutputTokens ?? NaN);
    setExpectedOutTokens(
      Number.isFinite(defOut) && defOut > 0 
        ? Math.min(defOut, MAX_OUTPUT_TOKENS) 
        : DEFAULT_OUTPUT_TOKENS
    );
  }, [pricing, model]);

  useEffect(() => {
    if (!pricing || !model || !tokens.length) {
      setCost(null);
      setInputCost(null);
      setOutputCost(null);
      return;
    }
    const entry = pricing[model];
    // Cost breakdown
    let inCost: number | null = null;
    let outCost: number | null = null;
    if (entry && entry.pricing) {
      const inPricePer1k = Number(entry.pricing.input);
      const outPricePer1k = Number(entry.pricing.output);
      const plannedOut = Number(expectedOutTokens ?? entry.avgOutputTokens ?? 0);
      if (isFinite(inPricePer1k)) {
        inCost = (tokens.length / 1000) * inPricePer1k;
      }
      if (isFinite(outPricePer1k) && isFinite(plannedOut) && plannedOut > 0) {
        outCost = (plannedOut / 1000) * outPricePer1k;
      }
    }
    setInputCost(inCost);
    setOutputCost(outCost);
    const total = [inCost, outCost].every(v => typeof v === 'number' && !isNaN(v as number))
      ? (inCost as number) + (outCost as number)
      : (typeof inCost === 'number' ? inCost : null);
    setCost(total);
  }, [pricing, model, tokens, expectedOutTokens]);

  const tokenizerLabel = TOKENIZERS.find(t => t.key === tokenizer)?.label ?? 'cl100k_base';

  useEffect(() => {
    if (!prompt) {
      setTokens([]);
      setDecodedTokens([]);
      return;
    }
    try {
      const tks = encode(prompt, tokenizer as any);
      setTokens(tks);
      setDecodedTokens(tks.map(t => ({ str: decode([t]), id: t })));
    } catch (e) {
      const tks = encode(prompt);
      setTokens(tks);
      setDecodedTokens(tks.map(t => ({ str: decode([t]), id: t })));
    }
  }, [prompt, tokenizer]);

  const hasTokens = tokens.length > 0;
  const tokenCoverage = useMemo(
    () => (hasTokens ? Math.min(100, (tokens.length / REFERENCE_TOKEN_WINDOW) * 100) : 0),
    [hasTokens, tokens.length]
  );
  const modelOptions = availableModels;
  const heroStats = [
    { label: 'Models tracked', value: pricing ? Object.keys(pricing).length || '—' : '—' },
    { label: 'Avg. token window', value: `${REFERENCE_TOKEN_WINDOW.toLocaleString()} ctx` },
    { label: 'Tokenizer', value: tokenizerLabel },
  ];

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-10 sm:gap-14 px-4 sm:px-6 py-8 sm:py-12">
        <header className="grid gap-8 lg:grid-cols-[1.2fr_minmax(0,0.8fr)] items-center">
          <div className="space-y-5">
            <p className="text-xs font-bold uppercase tracking-[0.2em] sm:tracking-[0.28em] text-rose-iris">Prompt Info</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-rose-text leading-tight">
              Measure tokens and cost before you hit send.
            </h1>
            <p className="text-base sm:text-lg text-rose-subtle leading-relaxed max-w-2xl">
              Paste a prompt to see live token counts and modeled cost for the model you pick. Change tokenizer and output length before you run it.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                className="rounded-xl bg-rose-iris text-rose-text px-5 py-3 text-sm font-semibold shadow-lg hover:bg-rose-foam transition-colors"
                href="#planner"
              >
                Start analyzing
              </a>
              <a
                className="rounded-xl border border-rose-highlightMed px-5 py-3 text-sm font-semibold text-rose-text hover:border-rose-iris hover:text-rose-iris transition-colors"
                href="https://helloworldfirm.com"
                target="_blank"
                rel="noopener noreferrer"
              >
                View docs
              </a>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:gap-4">
              {heroStats.map(stat => (
                <div key={stat.label} className="rounded-xl border border-rose-highlightMed/60 bg-black/40 backdrop-blur-lg px-3 sm:px-4 py-3">
                  <div className="text-xs text-rose-muted uppercase tracking-wide">{stat.label}</div>
                  <div className="mt-1 text-lg sm:text-xl font-semibold text-rose-text">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card rounded-3xl border-2 border-rose-highlightHigh/60 backdrop-blur-2xl p-5 sm:p-6 shadow-[0_40px_90px_-60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-rose-muted">Live preview</p>
                <p className="text-lg font-semibold text-rose-text">Visualizer</p>
              </div>
              <div className="flex items-center gap-2 bg-black/40 border border-rose-highlightMed/60 rounded-xl px-2 py-1">
                {(['snapshot', 'tokens'] as const).map(mode => (
                  <button
                    key={mode}
                    onClick={() => setVisualizerMode(mode)}
                    className={`px-3 py-1 text-[12px] font-semibold rounded-lg transition-all ${
                      visualizerMode === mode
                        ? 'bg-rose-iris/30 text-rose-text border border-rose-iris/60 shadow-inner'
                        : 'text-rose-subtle hover:text-rose-text'
                    }`}
                    aria-pressed={visualizerMode === mode}
                  >
                    {mode === 'snapshot' ? 'Snapshot' : 'Token view'}
                  </button>
                ))}
              </div>
            </div>
            {visualizerMode === 'snapshot' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-rose-subtle text-sm">Tokens</span>
                  <span className="text-2xl font-bold text-rose-text tabular-nums">{tokens.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-rose-subtle text-sm">Est. cost</span>
                  <span className="text-xl font-semibold text-rose-foam tabular-nums">
                    {cost !== null && !isNaN(cost) ? `$${cost.toFixed(6)}` : '—'}
                  </span>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-xs text-rose-subtle">
                  <div className="rounded-lg border border-rose-highlightMed bg-black/45 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide">Input</div>
                    <div className="text-base font-semibold text-rose-text tabular-nums">{tokens.length}</div>
                  </div>
                  <div className="rounded-lg border border-rose-highlightMed bg-black/45 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide">Output</div>
                    <div className="text-base font-semibold text-rose-text tabular-nums">{expectedOutTokens ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-rose-iris/60 bg-rose-iris/14 px-3 py-2">
                    <div className="text-[11px] uppercase tracking-wide text-rose-iris">Total</div>
                    <div className="text-base font-semibold text-rose-iris tabular-nums">{tokens.length + Number(expectedOutTokens ?? 0)}</div>
                  </div>
                </div>
                <p className="text-[12px] text-rose-muted">Tokenizer: {tokenizerLabel}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-rose-subtle text-sm">Live token stream</div>
                <div className="rounded-2xl border border-rose-highlightMed/70 bg-black/40 backdrop-blur-xl p-3 max-h-72 overflow-y-auto scrollbar-thin scrollbar-thumb-rose-highlightHigh scrollbar-track-black/50">
                  {decodedTokens.length === 0 ? (
                    <div className="text-sm text-rose-muted italic">Start typing to see tokens in real time.</div>
                  ) : (
                    <div className="flex flex-wrap gap-2.5">
                      {decodedTokens.map((tok, i) => (
                        <span
                          key={`${tok.id}-${i}`}
                          className="group flex flex-col items-center rounded-lg border border-rose-highlightMed/80 bg-rose-highlightLow/70 px-3 py-2 text-[13px] font-mono text-rose-subtle transition-all hover:scale-105 hover:border-rose-iris hover:bg-rose-highlightMed/80"
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
            )}
          </div>
        </header>

        <section id="planner" className="grid gap-6 sm:gap-8 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
          <div className="glass-card flex flex-col gap-6 sm:gap-7 rounded-2xl sm:rounded-3xl border-2 border-rose-highlightHigh/50 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl">
            <div className="space-y-3">
              <label className="block text-sm font-bold text-rose-text tracking-wide" htmlFor="prompt-input">
                Prompt
              </label>
              <PromptInput id="prompt-input" value={prompt} onChange={setPrompt} />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-rose-text tracking-wide" htmlFor="model-select">
                Model
              </label>
              <ModelSelect
                id="model-select"
                value={model}
                onChange={setModel}
                models={modelOptions}
                loading={modelsLoading}
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-bold text-rose-text tracking-wide" htmlFor="tokenizer-select">
                Tokenizer
              </label>
              <select
                id="tokenizer-select"
                value={tokenizer}
                onChange={e => setTokenizer(e.target.value as typeof TOKENIZERS[number]['key'])}
                className="glass-select w-full appearance-none rounded-xl border px-5 py-3 text-base font-semibold text-rose-text transition-all duration-200 focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/30 hover:border-rose-highlightHigh cursor-pointer"
              >
                {TOKENIZERS.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-rose-base text-rose-text py-2">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-rose-highlightMed/50 bg-black/35 backdrop-blur-xl px-4 sm:px-5 py-4 sm:py-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Output length</p>
                  <p className="text-sm text-rose-subtle">Blend a likely completion to model total cost.</p>
                </div>
                <span className="text-xs text-rose-muted">Max {MAX_OUTPUT_TOKENS.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="expected-out"
                  type="range"
                  min={0}
                  max={MAX_OUTPUT_TOKENS}
                  step={TOKEN_STEP}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(MAX_OUTPUT_TOKENS, Number(e.target.value))))}
                  className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-rose-highlightMed/60 accent-rose-iris transition-all"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_OUTPUT_TOKENS}
                  step={TOKEN_STEP}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(MAX_OUTPUT_TOKENS, Number(e.target.value))))}
                  className="w-24 sm:w-28 rounded-xl border border-rose-highlightMed bg-rose-base px-3 sm:px-4 py-2 text-right text-sm sm:text-base font-semibold text-rose-text tabular-nums focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-rose-highlightMed/50 bg-black/35 backdrop-blur-xl px-4 sm:px-5 py-4 sm:py-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Context usage</p>
                  <p className="text-sm text-rose-subtle">Based on {REFERENCE_TOKEN_WINDOW.toLocaleString()} tokens.</p>
                </div>
                <span className="text-xs text-rose-muted tabular-nums">{Math.round(tokenCoverage)}%</span>
              </div>
              <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-rose-highlightMed/50 shadow-inner">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-rose-foam via-rose-iris to-rose-pine transition-all duration-300 ease-out shadow-lg"
                  style={{ width: `${tokenCoverage}%` }}
                />
              </div>
            </div>
          </div>

          <aside className="glass-card flex flex-col gap-5 sm:gap-6 rounded-2xl sm:rounded-3xl border-2 border-rose-highlightHigh/50 backdrop-blur-2xl p-5 sm:p-7 shadow-2xl">
            <div className="rounded-2xl border border-rose-highlightMed/50 bg-black/35 backdrop-blur-xl px-4 sm:px-5 py-5">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-iris mb-2">Totals</p>
              <div className="grid grid-cols-3 gap-3 text-sm text-rose-text">
                <div className="rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-4 py-3">
                  <span className="text-rose-subtle text-xs">Prompt</span>
                  <div className="text-xl font-bold tabular-nums">{tokens.length}</div>
                </div>
                <div className="rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-4 py-3">
                  <span className="text-rose-subtle text-xs">Output</span>
                  <div className="text-xl font-bold tabular-nums">{expectedOutTokens ?? 0}</div>
                </div>
                <div className="rounded-xl border-2 border-rose-iris/60 bg-rose-iris/12 px-4 py-3">
                  <span className="text-rose-iris text-xs font-semibold">Combined</span>
                  <div className="text-xl font-bold text-rose-iris tabular-nums">
                    {tokens.length + Number(expectedOutTokens ?? 0)}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-highlightMed/50 bg-black/35 backdrop-blur-xl px-4 sm:px-5 py-5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Cost</p>
                <span className="text-[11px] text-rose-muted">USD</span>
              </div>
              <div className="grid gap-3">
                <div className="flex items-center justify-between rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-4 py-3">
                  <span className="text-sm text-rose-subtle">Input</span>
                  <span className="text-lg font-bold text-rose-text tabular-nums">
                    {inputCost !== null && !isNaN(inputCost) ? `$${inputCost.toFixed(6)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-4 py-3">
                  <span className="text-sm text-rose-subtle">Output</span>
                  <span className="text-lg font-bold text-rose-text tabular-nums">
                    {outputCost !== null && !isNaN(outputCost) ? `$${outputCost.toFixed(6)}` : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-xl border-2 border-rose-iris/60 bg-rose-iris/12 px-4 py-3">
                  <span className="text-sm font-semibold text-rose-text">Total</span>
                  <span className="text-xl font-bold text-rose-iris tabular-nums">
                    {cost !== null && !isNaN(cost) ? `$${cost.toFixed(6)}` : '—'}
                  </span>
                </div>
              </div>
            </div>

            {visualizerMode === 'snapshot' && decodedTokens.length > 0 && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Token breakdown</p>
                  <span className="text-[11px] text-rose-muted">Live from tokenizer</span>
                </div>
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-rose-highlightMed bg-black/40 backdrop-blur-lg p-4 scrollbar-thin scrollbar-thumb-rose-highlightHigh scrollbar-track-black">
                  <div className="flex flex-wrap gap-2.5">
                    {decodedTokens.map((tok, i) => (
                      <span
                        key={i}
                        className="group flex flex-col items-center rounded-lg border border-rose-highlightMed bg-rose-highlightLow px-2.5 py-1.5 text-[13px] font-mono text-rose-subtle transition-all hover:scale-105 hover:border-rose-iris hover:bg-rose-highlightMed"
                        title={`Token #${i + 1}\nID: ${tok.id}`}
                      >
                        <span className="leading-tight font-semibold text-rose-text group-hover:text-rose-foam transition-colors">{tok.str || <>&nbsp;</>}</span>
                        <span className="text-[10px] text-rose-muted group-hover:text-rose-subtle transition-colors">#{tok.id}</span>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </div>
  );
}
