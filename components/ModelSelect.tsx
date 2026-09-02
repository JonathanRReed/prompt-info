'use client';

import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { fetchPricing, type PricingMap } from '../lib/fetchPricing';
import { chooseDefaultModels } from '../lib/modelSelection';

type ModelSelectProps = {
  onChange: (model: string) => void;
  value?: string;
  id?: string;
  models?: string[];
  loading?: boolean;
  pricing?: PricingMap | null;
};

const MAX_VISIBLE_MODELS = 80;

function normalize(value: string) {
  return value.toLowerCase().replace(/[-_:./]/g, ' ');
}

function filterModels(models: string[], query: string) {
  const cleaned = query.trim();
  if (!cleaned) return models.slice(0, MAX_VISIBLE_MODELS);

  const parts = normalize(cleaned).split(/\s+/).filter(Boolean);
  return models
    .filter(model => {
      const normalizedModel = normalize(model);
      return parts.every(part => normalizedModel.includes(part));
    })
    .sort((a, b) => {
      const aStarts = normalize(a).startsWith(normalize(cleaned)) ? 0 : 1;
      const bStarts = normalize(b).startsWith(normalize(cleaned)) ? 0 : 1;
      return aStarts - bStarts || a.length - b.length || a.localeCompare(b);
    })
    .slice(0, MAX_VISIBLE_MODELS);
}

function formatRate(ratePerThousand: number | undefined) {
  if (typeof ratePerThousand !== 'number' || !Number.isFinite(ratePerThousand)) return 'N/A';
  const ratePerMillion = ratePerThousand * 1000;
  return `$${ratePerMillion.toLocaleString(undefined, { maximumFractionDigits: 4 })}`;
}

function formatContext(tokens: number | undefined) {
  if (typeof tokens !== 'number' || !Number.isFinite(tokens)) return 'Context unknown';
  if (tokens >= 1_000_000) return `${Number((tokens / 1_000_000).toPrecision(3))}M context`;
  if (tokens >= 1_000) return `${Number((tokens / 1_000).toPrecision(3))}K context`;
  return `${tokens.toLocaleString()} context`;
}

function ModelSelect({ onChange, value, id, models: externalModels, loading: externalLoading, pricing }: ModelSelectProps) {
  const generatedId = useId();
  const inputId = id ?? `model-select-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const shouldFetch = !externalModels;
  const optionList = externalModels ?? models;
  const isLoading = externalLoading ?? (shouldFetch && loading);
  const selectedModel = value && optionList.includes(value) ? value : '';
  const filteredModels = useMemo(() => {
    if (query.trim()) return filterModels(optionList, query);
    const curated = pricing
      ? chooseDefaultModels(optionList, pricing, 12)
      : optionList.slice(0, 12);
    return curated.length > 0 ? curated : optionList.slice(0, 12);
  }, [optionList, pricing, query]);
  const activeModel = filteredModels[activeIndex] ?? filteredModels[0] ?? '';
  const selectedEntry = pricing?.[selectedModel || filteredModels[0] || optionList[0]];

  useEffect(() => {
    if (!shouldFetch) return;

    let mounted = true;

    (async () => {
      try {
        const catalog = await fetchPricing();
        if (!mounted) return;
        const keys = Object.keys(catalog.data);
        if (keys.length === 0) {
          try {
            const res = await fetch('/data/llm-data.json');
            const json = await res.json();
            const staticKeys = Object.keys(json ?? {});
            if (mounted) setModels(staticKeys);
          } catch (e) {
            console.warn('ModelSelect fallback failed:', e);
            if (mounted) setModels([]);
          }
        } else {
          setModels(keys);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [shouldFetch]);

  useEffect(() => {
    if (isLoading || optionList.length === 0) return;
    if (!value || !optionList.includes(value)) {
      onChange(filteredModels[0] ?? optionList[0]);
    }
  }, [filteredModels, isLoading, onChange, optionList, value]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, optionList]);

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handlePointerDown);
    return () => document.removeEventListener('mousedown', handlePointerDown);
  }, [isOpen]);

  function selectModel(model: string) {
    onChange(model);
    setQuery('');
    setIsOpen(false);
    inputRef.current?.blur();
  }

  if (isLoading) {
    return (
      <div className="flex h-12 w-full items-center border border-rose-highlightMed bg-rose-surface px-4 py-3" role="status" aria-live="polite">
        <span className="font-mono text-xs uppercase tracking-[0.14em] text-rose-subtle">Loading models</span>
      </div>
    );
  }

  if (!optionList.length) {
    return <div className="border border-rose-love bg-rose-base p-3 text-sm text-rose-love">No models available. Check the pricing data source.</div>;
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="grid gap-px bg-rose-highlightMed border border-rose-highlightMed sm:grid-cols-[minmax(0,1fr)_auto]">
        <input
          ref={inputRef}
          id={inputId}
          type="search"
          role="combobox"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={isOpen}
          aria-activedescendant={isOpen && activeModel ? `${inputId}-option-${activeIndex}` : undefined}
          value={query}
          onChange={event => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={event => {
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex(index => Math.min(index + 1, Math.max(filteredModels.length - 1, 0)));
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              setIsOpen(true);
              setActiveIndex(index => Math.max(index - 1, 0));
            } else if (event.key === 'Enter') {
              if (isOpen && activeModel) {
                event.preventDefault();
                selectModel(activeModel);
              }
            } else if (event.key === 'Escape') {
              event.preventDefault();
              if (query) {
                setQuery('');
              } else {
                setIsOpen(false);
                inputRef.current?.blur();
              }
            }
          }}
          placeholder="Search model, for example gpt 4o or claude"
          className="min-h-12 w-full bg-rose-surface px-4 py-3 font-mono text-sm text-rose-text placeholder:text-rose-muted transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
        />
        <button
          type="button"
          onClick={() => {
            setQuery('');
            setIsOpen(open => !open);
            inputRef.current?.focus();
          }}
          className="min-h-12 bg-rose-base px-4 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:bg-rose-overlay hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none"
          aria-label={isOpen ? 'Close model results' : 'Open model results'}
        >
          {isOpen ? 'Close' : 'Browse'}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-[0.14em] text-rose-muted">
        <span>Selected: <span className="text-rose-text">{selectedModel || optionList[0]}</span></span>
        <span>{query.trim() ? `${filteredModels.length.toLocaleString()} matches` : `Provider-diverse browse set · ${filteredModels.length.toLocaleString()} of ${optionList.length.toLocaleString()}`}</span>
      </div>
      {selectedEntry && (
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-rose-muted">
          <span>{formatRate(selectedEntry.pricing.input)} in</span>
          <span>{formatRate(selectedEntry.pricing.output)} out</span>
          <span>{formatContext(selectedEntry.contextWindowTokens)}</span>
        </div>
      )}

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Model search results"
          className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-40 max-h-80 overflow-y-auto border border-rose-highlightMed bg-rose-base shadow-[12px_12px_0_var(--color-rose-love)]"
        >
          {filteredModels.length === 0 ? (
            <div className="p-4 text-sm text-rose-muted">No matching models. Try a shorter search.</div>
          ) : (
            filteredModels.map((model, index) => {
              const isSelected = model === selectedModel;
              const isActive = index === activeIndex;
              const modelEntry = pricing?.[model];
              return (
                <button
                  key={model}
                  id={`${inputId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onMouseDown={event => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => selectModel(model)}
                  className={`grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-rose-highlightMed px-4 py-3 text-left transition duration-150 last:border-b-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                    isActive ? 'bg-rose-overlay text-rose-text' : 'bg-rose-base text-rose-subtle'
                  } ${isSelected ? 'text-rose-love' : ''}`}
                >
                  <span className="min-w-0">
                    <span className="block whitespace-normal break-words font-mono text-sm font-bold">{model}</span>
                    {modelEntry && (
                      <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.1em] text-rose-muted">
                        <span>{formatRate(modelEntry.pricing.input)} in</span>
                        <span>{formatRate(modelEntry.pricing.output)} out</span>
                        <span>{formatContext(modelEntry.contextWindowTokens)}</span>
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-rose-muted">
                    {isSelected ? 'Selected' : 'Use'}
                  </span>
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

export default memo(ModelSelect);
