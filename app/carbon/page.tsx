'use client';
import { useEffect, useMemo, useState } from 'react';
import PromptInput from '../../components/PromptInput';
import ModelSelect from '../../components/ModelSelect';
import { encode } from 'gpt-tokenizer';
import { usePricingData } from '../../hooks/usePricingData';

export default function CarbonPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const {
    pricing,
    models: modelOptions,
    loading: pricingLoading,
    source: pricingSource,
    error: pricingError,
  } = usePricingData();

  useEffect(() => {
    if (!prompt) {
      setTokens([]);
      setCo2e(null);
      return;
    }
    const tks = encode(prompt);
    setTokens(tks);
  }, [prompt]);

  useEffect(() => {
    if (modelOptions.length === 0) {
      if (model !== '') {
        setModel('');
      }
      return;
    }

    if (!model || !modelOptions.includes(model)) {
      setModel(modelOptions[0]);
    }
  }, [modelOptions, model]);

  const activeModel = modelOptions.includes(model) ? model : modelOptions[0] ?? '';
  const selectedEntry = activeModel && pricing ? pricing[activeModel] : undefined;
  const metadataEntries = useMemo(() => {
    if (!selectedEntry?.metadata) {
      return [] as Array<[string, string]>;
    }

    return Object.entries(selectedEntry.metadata).reduce<Array<[string, string]>>((acc, [key, value]) => {
      if (value === null || value === undefined) {
        return acc;
      }

      if (typeof value === 'string') {
        const trimmed = value.trim();
        if (trimmed) {
          acc.push([key, trimmed]);
        }
        return acc;
      }

      if (typeof value === 'number') {
        acc.push([key, value.toString()]);
        return acc;
      }

      if (typeof value === 'boolean') {
        acc.push([key, value ? 'true' : 'false']);
        return acc;
      }

      return acc;
    }, []);
  }, [selectedEntry]);

  useEffect(() => {
    if (!pricing || !activeModel || tokens.length === 0) {
      setCo2e(null);
      setCo2eFallback(false);
      return;
    }

    const entry = pricing[activeModel];
    let factor = 0.0002;
    let usedFallback = true;

    if (entry) {
      const entryFactor = entry.co2eFactor;

      if (typeof entryFactor === 'number' && !Number.isNaN(entryFactor)) {
        factor = entryFactor;
        usedFallback = false;
      }
    }

    const totalTokens = tokens.length;
    setCo2e(totalTokens * factor);
    setCo2eFallback(usedFallback);
  }, [pricing, activeModel, tokens]);

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">AI Carbon Footprint Estimator</h1>
      <PromptInput value={prompt} onChange={setPrompt} />
      <div className="my-4 space-y-2">
        <ModelSelect
          models={modelOptions}
          value={activeModel}
          onChange={setModel}
          loading={pricingLoading}
        />
        {pricingSource === 'fallback' && !pricingError && (
          <div className="text-xs text-yellow-300">
            Using bundled pricing data. Add Supabase credentials for live updates.
          </div>
        )}
        {pricingError && (
          <div className="text-xs text-red-300">{pricingError}</div>
        )}
      </div>
      {co2e !== null && !Number.isNaN(co2e) ? (
        <div className="mt-4 p-4 bg-[rgba(10,15,41,0.15)] rounded-lg space-y-3">
          <div>
            <p>
              Estimated CO₂e: <strong>{co2e >= 0.0001 ? `≈ ${co2e.toFixed(4)} g` : '< 0.0001 g'}</strong>
              {co2eFallback && <span className="text-yellow-400 ml-2" title="Fallback value used">*</span>}
            </p>
            <p className="text-sm italic mt-2">
              Estimate based only on prompt token count and reported gCO₂e-per-token factors. Real-world emissions may vary.
            </p>
          </div>
          {(selectedEntry || metadataEntries.length > 0) && (
            <div className="text-xs text-blue-200 space-y-1">
              {typeof selectedEntry?.co2eFactor === 'number' && !Number.isNaN(selectedEntry.co2eFactor) && (
                <div>
                  Model CO₂e factor: <b>{selectedEntry.co2eFactor.toExponential(3)} g/token</b>
                </div>
              )}
              {selectedEntry?.provider && (
                <div>
                  Provider: <b>{selectedEntry.provider}</b>
                </div>
              )}
              {selectedEntry?.description && (
                <div className="text-blue-200/90">{selectedEntry.description}</div>
              )}
              {metadataEntries.length > 0 && (
                <div className="text-blue-200/80 space-y-0.5">
                  {metadataEntries.map(([key, value]) => (
                    <div key={key}>
                      <span className="font-semibold">{key}:</span> {value}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 p-4 bg-[rgba(10,15,41,0.15)] rounded-lg text-yellow-400">
          {tokens.length === 0
            ? 'Enter a prompt above to estimate carbon impact.'
            : 'No carbon factor is available for this model yet. Update your Supabase data to add one.'}
        </div>
      )}
    </div>
  );
}
