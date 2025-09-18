'use client';
import { useState, useEffect } from 'react';
import PromptInput from '../../components/PromptInput';
import ModelSelect from '../../components/ModelSelect';
import { encode } from 'gpt-tokenizer';
import { fetchPricing, PricingMap } from '../../lib/fetchPricing';

export default function CarbonPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const [pricing, setPricing] = useState<PricingMap | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const data = await fetchPricing();
        if (mounted) {
          setPricing(data);
        }
      } catch (error) {
        console.error('Failed to load pricing from Supabase', error);
        if (mounted) {
          setPricing({});
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!prompt) {
      setTokens([]);
      setCo2e(null);
      return;
    }
    const encoded = encode(prompt);
    setTokens(encoded);
  }, [prompt]);

  useEffect(() => {
    if (!pricing || !model || !tokens.length) {
      setCo2e(null);
      setCo2eFallback(false);
      return;
    }

    const entry = pricing[model];
    const fallbackFactor = 0.0002;
    let factor = fallbackFactor;
    let usedFallback = true;

    if (entry && typeof entry.co2eFactor === 'number' && !Number.isNaN(entry.co2eFactor)) {
      factor = entry.co2eFactor;
      usedFallback = false;
    }

    setCo2e(tokens.length * factor);
    setCo2eFallback(usedFallback);
  }, [pricing, model, tokens]);

  const tokensCount = tokens.length;
  const hasTokens = tokensCount > 0;
  const hasEstimate = hasTokens && co2e !== null && !Number.isNaN(co2e);
  const co2eDisplay = hasEstimate ? co2e ?? 0 : null;
  const perThousand = hasEstimate && tokensCount
    ? (co2eDisplay! / tokensCount) * 1000
    : null;
  const modelOptions = pricing ? Object.keys(pricing) : [];
  const modelsLoading = !pricing;

  const insightMessage = (() => {
    if (!hasTokens) {
      return 'Add prompt text to project carbon usage before you send it to the model.';
    }
    if (!pricing || modelOptions.length === 0) {
      return 'Connect your pricing data to unlock model-by-model carbon profiles.';
    }
    if (!model) {
      return 'Pick a model to retrieve its carbon profile.';
    }
    if (!hasEstimate) {
      return 'We could not calculate emissions for this prompt with the available data.';
    }
    if (co2eFallback) {
      return 'Using a generic emissions factor because this model is missing specific data.';
    }
    return 'Emission estimate includes only prompt tokens. Adjust for expected output to get a fuller picture.';
  })();

  return (
    <div className="min-h-screen w-full bg-slate-100">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-16">
        <header className="space-y-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Carbon insight</p>
          <h1 className="text-4xl font-semibold text-slate-900">Estimate prompt emissions</h1>
          <p className="text-base text-slate-600">
            Quickly approximate the grams of CO₂e tied to your prompt tokens and spot where efficiency wins might live.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
          <div className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="carbon-prompt">
                Prompt
              </label>
              <PromptInput id="carbon-prompt" value={prompt} onChange={setPrompt} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700" htmlFor="carbon-model">
                Model
              </label>
              <ModelSelect
                id="carbon-model"
                value={model}
                onChange={setModel}
                models={modelOptions}
                loading={modelsLoading}
              />
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
              Emission estimates scale with token count. Keep summaries tight, reuse context where you can, and cache responses for repeated calls.
            </div>
          </div>

          <aside className="flex flex-col gap-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Emission estimate</p>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 px-6 py-8 text-center shadow-inner">
                <div className="text-sm font-medium uppercase tracking-[0.3em] text-slate-400">Total CO₂e</div>
                <div className="mt-3 text-4xl font-semibold text-slate-900">
                  {hasEstimate ? `${co2eDisplay!.toFixed(4)} g` : '—'}
                </div>
                {co2eFallback && (
                  <p className="mt-2 text-xs text-amber-500">Using fallback factor until model-specific data is available.</p>
                )}
              </div>
              <p className="text-sm text-slate-600">{insightMessage}</p>
            </div>

            <dl className="grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Prompt tokens</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">{tokensCount}</dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">CO₂e per 1k tokens</dt>
                <dd className="mt-1 text-2xl font-semibold text-slate-900">
                  {perThousand !== null ? `${perThousand.toFixed(4)} g` : '—'}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 sm:col-span-2">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model factor</dt>
                <dd className="mt-1 text-base text-slate-700">
                  {model && pricing && pricing[model]
                    ? `${pricing[model].co2eFactor.toFixed(6)} g per token`
                    : 'Select a model to view its carbon intensity.'}
                </dd>
              </div>
            </dl>
          </aside>
        </section>

        <section className="grid gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/40">
          <h2 className="text-lg font-semibold text-slate-900">Sustainable prompt patterns</h2>
          <ul className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-semibold text-slate-800">Chunk thoughtfully.</span> Break long contexts into reusable snippets instead of resending the full history.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-semibold text-slate-800">Cache completions.</span> Store frequent responses so you can serve them without invoking the model again.
            </li>
            <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <span className="font-semibold text-slate-800">Monitor output length.</span> Align generation parameters with the shortest useful completion to curb downstream emissions.
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
