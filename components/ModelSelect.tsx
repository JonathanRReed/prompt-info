'use client';
import { useState, useEffect } from 'react';
import { fetchPricing, PricingMap } from '../lib/fetchPricing';

type ModelSelectProps = {
  onChange: (model: string) => void;
  value?: string;
  id?: string;
  models?: string[];
  loading?: boolean;
};

export default function ModelSelect({ onChange, value, id = 'model-select', models: externalModels, loading: externalLoading }: ModelSelectProps) {
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
    return <div className="text-sm text-slate-400">Loading models…</div>;
  }

  if (!optionList?.length) {
    return <div className="text-sm text-amber-400">No models available. Check your pricing data source.</div>;
  }

  const currentValue = value && optionList.includes(value) ? value : optionList[0] ?? '';

  return (
    <select
      id={id}
      value={currentValue}
      onChange={e => onChange(e.target.value)}
      className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-900/70 px-3 py-2 text-slate-100 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.8)] transition focus:border-accentPrimary focus:outline-none focus:ring-4 focus:ring-accentPrimary/30"
    >
      {optionList.map(model => (
        <option key={model} value={model}>
          {model}
        </option>
      ))}
    </select>
  );
}
