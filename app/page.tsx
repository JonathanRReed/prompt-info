'use client';
import { useEffect, useMemo, useState } from 'react';
import PromptInput from '../components/PromptInput';
import ModelSelect from '../components/ModelSelect';
import { encode, decode } from 'gpt-tokenizer';
import { usePricingData } from '../hooks/usePricingData';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [decodedTokens, setDecodedTokens] = useState<{ str: string; id: number }[]>([]);
  const [cost, setCost] = useState<number | null>(null);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const {
    pricing,
    models: modelOptions,
    loading: pricingLoading,
    source: pricingSource,
    error: pricingError,
  } = usePricingData();

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

  useEffect(() => {
    if (!pricing || !activeModel || tokens.length === 0) {
      setCost(null);
      setCo2e(null);
      return;
    }

    if (!selectedEntry) {
      setCost(null);
      setCo2e(tokens.length * 0.0002);
      setCo2eFallback(true);
      return;
    }

    let validCost: number | null = null;
    const inputRate = selectedEntry.pricing?.input;

    if (typeof inputRate === 'number' && !Number.isNaN(inputRate)) {
      validCost = (tokens.length / 1000) * inputRate;
    }

    setCost(validCost);

    let factor = 0.0002;
    let usedFallback = true;
    const entryFactor = selectedEntry.co2eFactor;

    if (typeof entryFactor === 'number' && !Number.isNaN(entryFactor)) {
      factor = entryFactor;
      usedFallback = false;
    }

    setCo2e(tokens.length * factor);
    setCo2eFallback(usedFallback);
  }, [pricing, activeModel, selectedEntry, tokens]);

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

  let slices: number[][] = [];
  if (tokens.length <= 10) {
    slices = tokens.map((t, i) => [t]);
  } else {
    const numSlices = 10;
    const sliceSize = Math.ceil(tokens.length / numSlices);
    for (let i = 0; i < numSlices; i++) {
      slices.push(tokens.slice(i * sliceSize, (i + 1) * sliceSize));
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full">
      <div className="relative flex flex-col items-center justify-center min-h-[70vh] w-full max-w-3xl mx-auto">
        {/* Glowing, animated background element (bigger, slower) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] rounded-full opacity-80 blur-[110px] -z-10 animate-pulse-slow pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 50% 45%, #a259ff 0%, #4dfff0 40%, #ff4dcb 80%, transparent 100%)'
          }}
        />
        <div className="w-full max-w-xl mx-auto px-6 py-10 rounded-3xl shadow-2xl bg-[rgba(10,15,41,0.65)] backdrop-blur-3xl border border-[rgba(162,89,255,0.22)]" style={{boxShadow: '0 4px 48px 0 #a259ff44', WebkitBackdropFilter: 'blur(36px)', backdropFilter: 'blur(36px)'}}>
          <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center bg-gradient-to-r from-[#a259ff] via-[#4dfff0] to-[#ff4dcb] bg-clip-text text-transparent drop-shadow-lg">Prompt Info</h1>
          <PromptInput value={prompt} onChange={setPrompt} />
          <div className="my-4 space-y-2">
            <ModelSelect
              models={modelOptions}
              value={activeModel}
              onChange={setModel}
              loading={pricingLoading}
            />
            {pricingSource === 'fallback' && !pricingError && (
              <div className="text-xs text-yellow-300 text-center">
                Using bundled pricing data. Add Supabase credentials for live updates.
              </div>
            )}
            {pricingError && (
              <div className="text-xs text-red-300 text-center">{pricingError}</div>
            )}
          </div>
          <div className="mb-4 text-xs font-mono text-blue-200 text-center">
            Tokenizer: <b>Universal GPT Tokenizer (gpt-tokenizer)</b>
          </div>
          <div className="bg-[rgba(10,15,41,0.35)] p-6 rounded-xl shadow-lg backdrop-blur-md border border-[rgba(77,255,240,0.18)]">
            <div className="flex gap-1 mb-4">
              {slices.map((slice, idx) => (
                <div
                  key={idx}
                  className="flex-1 h-8 rounded transition-all duration-150"
                  style={{
                    background:
                      slice.length === 0
                        ? '#222'
                        : `linear-gradient(90deg, #4dfff0 ${(slice.length / (tokens.length <= 10 ? 1 : Math.ceil(tokens.length / 10))) * 100}%, #a259ff 100%)`,
                    border: '1px solid #4dfff0',
                    opacity:
                      (tokens.length <= 10)
                        ? 0.9
                        : (Math.min(1, Math.max(0.2, (slice.length / Math.ceil(tokens.length / 10)) + 0.2))),
                    boxShadow: '0 0 8px #4dfff0b0',
                  }}
                  title={
                    tokens.length <= 10
                      ? `Token #${idx + 1}`
                      : `Slice ${idx + 1}: Tokens ${idx * Math.ceil(tokens.length / 10) + 1}-${Math.min((idx + 1) * Math.ceil(tokens.length / 10), tokens.length)} (${slice.length})`
                  }
                />
              ))}
            </div>
            {decodedTokens.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-4 justify-center">
                {decodedTokens.map((tok, i) => (
                  <span
                    key={i}
                    className="px-1.5 py-1 rounded bg-[#4dfff0]/20 border border-[#4dfff0] text-accentPrimary text-sm font-mono cursor-pointer transition hover:bg-[#4dfff0]/40 hover:text-black flex flex-col items-center shadow-[0_0_8px_#4dfff0b0]"
                    title={`Token #${i + 1}\nID: ${tok.id}`}
                  >
                    <span className="text-base leading-none">{tok.str || <>&nbsp;</>}</span>
                    <span className="text-[10px] text-blue-300">#{tok.id}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-2 text-center space-y-3">
              <div className="text-lg">
                <span className="mr-4">Total tokens: <b>{tokens.length}</b></span>
                {cost !== null && !Number.isNaN(cost) ? (
                  <span>Estimated cost: <b>${cost.toFixed(8)}</b></span>
                ) : (
                  <span className="text-blue-400">Please input a prompt.</span>
                )}
              </div>
              {co2e !== null && !Number.isNaN(co2e) && (
                <div className="text-lg">
                  Estimated CO₂e: <b>{co2e.toFixed(4)} g</b>
                  {co2eFallback && <span className="text-yellow-400" title="Fallback value used">*</span>}
                </div>
              )}
              {(selectedEntry?.provider || (selectedEntry?.avgOutputTokens ?? null) || selectedEntry?.description || metadataEntries.length > 0) && (
                <div className="text-sm text-blue-200 space-y-1">
                  {selectedEntry?.provider && (
                    <div>
                      Provider: <b>{selectedEntry.provider}</b>
                    </div>
                  )}
                  {typeof selectedEntry?.avgOutputTokens === 'number' && !Number.isNaN(selectedEntry.avgOutputTokens) && (
                    <div>
                      Avg output tokens: <b>{Math.round(selectedEntry.avgOutputTokens)}</b>
                    </div>
                  )}
                  {selectedEntry?.description && (
                    <div className="text-xs text-blue-200/90">{selectedEntry.description}</div>
                  )}
                  {metadataEntries.length > 0 && (
                    <div className="text-xs text-blue-200/80 space-y-0.5">
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
          </div>
        </div>
      </div>
    </div>
  );
}
