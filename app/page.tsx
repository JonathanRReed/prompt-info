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

  const hasTokens = tokens.length > 0;
  const tokenCoverage = useMemo(
    () => (hasTokens ? Math.min(100, (tokens.length / REFERENCE_TOKEN_WINDOW) * 100) : 0),
    [hasTokens, tokens.length]
  );
  const modelOptions = availableModels;

  return (
    <div className="min-h-screen w-full">
      <main className="mx-auto flex w-full max-w-7xl flex-col gap-12 px-6 py-20">
        <header className="text-center space-y-4">
          <p className="text-xs font-bold uppercase tracking-[0.28em] text-rose-iris">Token planner</p>
          <h1 className="text-5xl font-bold text-rose-text tracking-tight">Prompt Info</h1>
          <p className="mt-4 text-lg text-rose-subtle max-w-2xl mx-auto leading-relaxed">
            Understand token count, estimated cost, and carbon footprint before you send your next prompt.
          </p>
        </header>

        <section className="grid gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-8 rounded-3xl border-2 border-rose-highlightHigh/50 bg-rose-surface p-8 shadow-2xl transition-all hover:border-rose-iris/60">
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

            <div className="pt-4 border-t border-rose-highlightMed/30">
              <p className="text-xs text-rose-muted">
                Tokenizer: <span className="font-semibold text-rose-foam">{tokenizerName}</span>
              </p>
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border-2 border-rose-highlightHigh/50 bg-rose-surface p-8 shadow-2xl">
            <div className="rounded-2xl border border-rose-highlightMed/50 bg-rose-overlay px-7 py-7">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-iris mb-1">Overview</p>
              <div className="mt-6 space-y-5">
                <div className="flex items-baseline justify-between">
                  <span className="text-5xl font-bold text-rose-text tabular-nums">{tokens.length}</span>
                  <span className="text-sm font-medium text-rose-subtle uppercase tracking-wider">tokens</span>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-rose-subtle">
                    <span>Approx. context usage</span>
                    <span className="tabular-nums">{Math.round(tokenCoverage)}%</span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-rose-highlightMed/50 shadow-inner">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-rose-foam via-rose-iris to-rose-pine transition-all duration-300 ease-out shadow-lg"
                      style={{ width: `${tokenCoverage}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-rose-muted leading-relaxed">Based on a {REFERENCE_TOKEN_WINDOW.toLocaleString()} token window.</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-rose-highlightMed/50 bg-rose-overlay px-6 py-6">
              <div className="flex flex-wrap items-center gap-4">
                <div className="grow space-y-2 text-xs text-rose-subtle">
                  <label htmlFor="expected-out" className="font-bold uppercase tracking-wider text-rose-text">
                    Expected output tokens
                  </label>
                  <p className="text-rose-subtle/80 leading-relaxed">Blend a likely completion length to model total costs.</p>
                </div>
                <input
                  id="expected-out"
                  type="range"
                  min={0}
                  max={MAX_OUTPUT_TOKENS}
                  step={TOKEN_STEP}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(MAX_OUTPUT_TOKENS, Number(e.target.value))))}
                  className="h-1.5 w-48 cursor-pointer appearance-none rounded-full bg-rose-highlightMed/60 accent-rose-iris transition-all"
                />
                <input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={MAX_OUTPUT_TOKENS}
                  step={TOKEN_STEP}
                  value={Number(expectedOutTokens ?? 0)}
                  onChange={e => setExpectedOutTokens(Math.max(0, Math.min(MAX_OUTPUT_TOKENS, Number(e.target.value))))}
                  className="w-28 rounded-xl border border-rose-highlightMed bg-rose-base px-4 py-2 text-right font-semibold text-rose-text tabular-nums focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/40 transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
              <div className="mt-6 grid gap-3 text-sm text-rose-text">
                <div className="flex items-center justify-between rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-5 py-3.5">
                  <span className="text-rose-subtle font-medium">Prompt tokens</span>
                  <span className="text-xl font-bold text-rose-text tabular-nums">{tokens.length}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-rose-highlightMed bg-rose-highlightLow px-5 py-3.5">
                  <span className="text-rose-subtle font-medium">Output tokens</span>
                  <span className="text-xl font-bold text-rose-text tabular-nums">{expectedOutTokens ?? 0}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border-2 border-rose-iris/60 bg-rose-iris/10 px-5 py-3.5">
                  <span className="text-rose-text font-semibold">Combined tokens</span>
                  <span className="text-xl font-bold text-rose-iris tabular-nums">
                    {tokens.length + Number(expectedOutTokens ?? 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Cost Breakdown</p>
              <div className="grid gap-3 text-sm text-rose-text">
                <div className="flex flex-col gap-2 rounded-xl border border-rose-highlightMed bg-rose-overlay px-5 py-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-muted">
                    <span>Input cost</span>
                    <span className="rounded-full bg-rose-highlightHigh/50 px-2.5 py-1 text-[10px] font-bold text-rose-text">USD</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-text tabular-nums">
                    {inputCost !== null && !isNaN(inputCost) ? `$${inputCost.toFixed(6)}` : '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-rose-highlightMed bg-rose-overlay px-5 py-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-muted">
                    <span>Output cost</span>
                    <span className="rounded-full bg-rose-highlightHigh/50 px-2.5 py-1 text-[10px] font-bold text-rose-text">USD</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-text tabular-nums">
                    {outputCost !== null && !isNaN(outputCost) ? `$${outputCost.toFixed(6)}` : '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border-2 border-rose-iris/60 bg-rose-iris/15 px-5 py-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-text">
                    <span>Total cost</span>
                    <span className="rounded-full bg-rose-iris/40 px-2.5 py-1 text-[10px] font-bold text-rose-text">USD</span>
                  </div>
                  <div className="text-3xl font-bold text-rose-iris tabular-nums">
                    {cost !== null && !isNaN(cost) ? `$${cost.toFixed(6)}` : '—'}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl border border-rose-love/50 bg-rose-love/10 px-5 py-4">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-rose-love">
                    <span>Estimated CO₂e</span>
                    <span className="rounded-full bg-rose-love/30 px-2.5 py-1 text-[10px] font-bold text-rose-text">grams</span>
                  </div>
                  <div className="text-2xl font-bold text-rose-text tabular-nums">
                    {co2e !== null && !isNaN(co2e) ? `${co2e.toFixed(4)} g${co2eFallback ? '*' : ''}` : '—'}
                  </div>
                  {co2eFallback && (
                    <p className="text-[11px] text-rose-gold leading-relaxed">Using generic emissions factor. Update pricing data for precise values.</p>
                  )}
                </div>
              </div>
            </div>

            {decodedTokens.length > 0 && (
              <div className="flex flex-col gap-4">
                <p className="text-xs font-bold uppercase tracking-widest text-rose-iris">Token breakdown</p>
                <div className="max-h-56 overflow-y-auto rounded-2xl border border-rose-highlightMed bg-rose-overlay p-4 scrollbar-thin scrollbar-thumb-rose-highlightHigh scrollbar-track-rose-base">
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
