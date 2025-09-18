'use client';
import { useState, useEffect } from 'react';
import PromptInput from '../components/PromptInput';
import ModelSelect from '../components/ModelSelect';
import { encode, decode } from 'gpt-tokenizer';
import { fetchPricing, PricingMap } from '../lib/fetchPricing';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [decodedTokens, setDecodedTokens] = useState<{str: string, id: number}[]>([]);
  const [cost, setCost] = useState<number | null>(null); // total cost (backward compatible)
  const [inputCost, setInputCost] = useState<number | null>(null);
  const [outputCost, setOutputCost] = useState<number | null>(null);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const [pricing, setPricing] = useState<PricingMap | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [modelsLoading, setModelsLoading] = useState<boolean>(true);
  const [expectedOutTokens, setExpectedOutTokens] = useState<number | null>(null);

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
    setExpectedOutTokens(Number.isFinite(defOut) && defOut > 0 ? Math.min(defOut, 131072) : 4096);
  }, [pricing, model]);

  useEffect(() => {
    if (!pricing || !model || !tokens.length) {
      setCost(null);
      setInputCost(null);
      setOutputCost(null);
      setCo2e(null);
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
    // Carbon: use new structure
    let factor = 0.0002; // fallback
    let usedFallback = false;
    if (entry && typeof entry.co2eFactor === 'number' && !isNaN(entry.co2eFactor)) {
      factor = entry.co2eFactor;
    } else {
      usedFallback = true;
    }
    setCo2e(tokens.length * factor);
    setCo2eFallback(usedFallback);
  }, [pricing, model, tokens, expectedOutTokens]);

  const tokenizerName = 'Universal GPT Tokenizer (gpt-tokenizer)';

  useEffect(() => {
    if (!prompt) {
      setTokens([]);
      setDecodedTokens([]);
      return;
    }
    const tks = encode(prompt);
    setTokens(tks);
    setDecodedTokens(tks.map(t => ({ str: decode([t]), id: t })));
  }, [prompt]);

  const referenceTokenWindow = 4096;
  const hasTokens = tokens.length > 0;
  const tokenCoverage = hasTokens
    ? Math.min(100, (tokens.length / referenceTokenWindow) * 100)
    : 0;
  // modelOptions and modelsLoading now come from state with fallback
  const modelOptions = availableModels;

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16">
        <header className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Token planner</p>
          <h1 className="mt-3 text-4xl font-semibold text-slate-100">Prompt Info</h1>
          <p className="mt-4 text-base text-slate-400">
            Understand token count, estimated cost, and carbon footprint before you send your next prompt.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="prompt-input">
                Prompt
              </label>
              <PromptInput id="prompt-input" value={prompt} onChange={setPrompt} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300" htmlFor="model-select">
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

            <p className="text-xs text-slate-400">
              Tokenizer: <span className="font-semibold text-slate-200">{tokenizerName}</span>
            </p>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-slate-800/60 bg-slate-900/70 p-6 shadow-[0_40px_90px_-60px_rgba(15,23,42,0.9)] backdrop-blur-xl">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/50 px-6 py-6 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Overview</p>
              <div className="mt-5 space-y-4">
                <div className="flex items-baseline justify-between">
                  <span className="text-4xl font-semibold text-white">{tokens.length}</span>
                  <span className="text-sm text-slate-400">tokens</span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>Approx. context usage</span>
                    <span>{Math.round(tokenCoverage)}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-accentPrimary to-slate-500 transition-all"
                      style={{ width: `${tokenCoverage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Based on a {referenceTokenWindow.toLocaleString()} token window.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-950/50 px-5 py-5 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grow space-y-1 text-xs text-slate-400">
                  <label htmlFor="expected-out" className="font-semibold uppercase tracking-wider text-slate-300">
                    Expected output tokens
                  </label>
                  <p>Blend a likely completion length to model total costs.</p>
                </div>
                <input
                  id="expected-out"
                  type="range"
                  min={0}
                  max={131072}
                  step={64}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(131072, Number(e.target.value))))}
                  className="h-1 w-48 cursor-pointer appearance-none rounded-full bg-slate-800 accent-accentPrimary"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={131072}
                  step={64}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(131072, Number(e.target.value))))}
                  className="w-24 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-right text-slate-100 shadow-[0_12px_32px_-28px_rgba(15,23,42,0.8)] focus:border-accentPrimary focus:outline-none focus:ring-2 focus:ring-accentPrimary/30"
                />
              </div>
              <div className="mt-5 grid gap-3 text-sm text-slate-200">
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <span className="text-slate-400">Prompt tokens</span>
                  <span className="text-lg font-semibold text-white">{tokens.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
                  <span className="text-slate-400">Output tokens</span>
                  <span className="text-lg font-semibold text-white">{expectedOutTokens ?? 0}</span>
                </div>
                <div className="flex flex-col gap-1 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-sm">
                  <span className="text-slate-400">Combined tokens</span>
                  <span className="text-lg font-semibold text-white">
                    {tokens.length + Number(expectedOutTokens ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="grid gap-3 text-sm text-slate-200">
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Input cost</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">USD</span>
                </div>
                <div className="text-2xl font-semibold text-white">
                  {inputCost !== null && !isNaN(inputCost) ? `$${inputCost.toFixed(6)}` : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Output cost</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">USD</span>
                </div>
                <div className="text-2xl font-semibold text-white">
                  {outputCost !== null && !isNaN(outputCost) ? `$${outputCost.toFixed(6)}` : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Total cost</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">USD</span>
                </div>
                <div className="text-2xl font-semibold text-white">
                  {cost !== null && !isNaN(cost) ? `$${cost.toFixed(6)}` : '—'}
                </div>
              </div>
              <div className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/60 px-4 py-4 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
                <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <span>Estimated CO₂e</span>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">grams</span>
                </div>
                <div className="text-2xl font-semibold text-white">
                  {co2e !== null && !isNaN(co2e) ? `${co2e.toFixed(4)} g${co2eFallback ? '*' : ''}` : '—'}
                </div>
                {co2eFallback && (
                  <p className="text-[11px] text-amber-400">Using generic emissions factor. Update pricing data for precise values.</p>
                )}
              </div>
            </div>

            {decodedTokens.length > 0 && (
              <div className="flex flex-col gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Token breakdown</p>
                <div className="max-h-48 overflow-y-auto rounded-2xl border border-slate-800 bg-slate-950/50 p-3 shadow-[inset_0_-1px_0_rgba(148,163,184,0.08)]">
                  <div className="flex flex-wrap gap-2">
                    {decodedTokens.map((tok, i) => (
                      <span
                        key={i}
                        className="flex flex-col items-center rounded-xl border border-slate-800 bg-slate-900/80 px-2 py-1 text-[13px] font-mono text-slate-300 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.8)]"
                        title={`Token #${i + 1}\nID: ${tok.id}`}
                      >
                        <span className="leading-tight text-white">{tok.str || <>&nbsp;</>}</span>
                        <span className="text-[10px] text-slate-500">#{tok.id}</span>
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
