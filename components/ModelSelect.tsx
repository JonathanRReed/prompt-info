'use client';
import { useState, useEffect, memo } from 'react';
import { fetchPricing, PricingMap } from '../lib/fetchPricing';

type ModelSelectProps = {
  onChange: (model: string) => void;
  value?: string;
  id?: string;
  models?: string[];
  loading?: boolean;
};

function ModelSelect({ onChange, value, id = 'model-select', models: externalModels, loading: externalLoading }: ModelSelectProps) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const shouldFetch = !externalModels;
  const optionList = externalModels ?? models;
  const isLoading = externalLoading ?? (shouldFetch && loading);

  useEffect(() => {
    if (!shouldFetch) {
      if (externalModels && externalModels.length && !value) {
        onChange(externalModels[0]);
      }
      return;
    }

    let mounted = true;

    (async () => {
      try {
        const data: PricingMap = await fetchPricing();
        if (!mounted) return;
        const keys = Object.keys(data ?? {});
        if (keys.length === 0) {
          // Fallback to static JSON
          try {
            const res = await fetch('/data/llm-data.json');
            const json = await res.json();
            const staticKeys = Object.keys(json ?? {});
            if (!mounted) return;
            setModels(staticKeys);
            if (staticKeys.length && !value) onChange(staticKeys[0]);
          } catch (e) {
            console.warn('ModelSelect fallback failed:', e);
            setModels([]);
          }
        } else {
          setModels(keys);
          if (keys.length && !value) onChange(keys[0]);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [externalModels, onChange, shouldFetch, value]);

  if (isLoading) {
    return <div className="text-sm text-rose-subtle">Loading models…</div>;
  }

  if (!optionList?.length) {
    return <div className="text-sm text-rose-gold">No models available. Check your pricing data source.</div>;
  }

  const currentValue = value && optionList.includes(value) ? value : optionList[0] ?? '';

  return (
    <select
      id={id}
      value={currentValue}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none rounded-xl border border-rose-highlightMed bg-black/50 backdrop-blur-lg px-5 py-3 text-base font-medium text-rose-text transition-all duration-200 focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/30 hover:border-rose-highlightHigh cursor-pointer"
    >
      {optionList.map(model => (
        <option key={model} value={model} className="bg-rose-base text-rose-text py-2">
          {model}
        </option>
      ))}
    </select>
  );
}

export default memo(ModelSelect);
