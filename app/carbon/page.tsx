'use client';
import { useState, useEffect } from 'react';
import PromptInput from '../../components/PromptInput';
import ModelSelect from '../../components/ModelSelect';
import { encode } from 'gpt-tokenizer';

export default function CarbonPage() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    fetch('/data/llm-data.json')
      .then(res => res.json())
      .then(data => {
        setPricing(data);
      });
  }, []);

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
    if (!pricing || !model || !tokens.length) {
      setCo2e(null);
      setCo2eFallback(false);
      return;
    }
    const entry = pricing[model];
    let co2eFactor = 0.001; // fallback carbon factor per token
    let usedFallback = false;
    if (entry) {
      if (typeof entry.co2eFactor === 'number' && !isNaN(entry.co2eFactor)) {
        co2eFactor = entry.co2eFactor;
      } else {
        usedFallback = true;
      }
    } else {
      usedFallback = true;
    }
    const totalTokens = tokens.length; // Only input tokens, no output
    const rawCo2e = totalTokens * co2eFactor;
    // Debug output for diagnosis
    console.log('[CARBON DEBUG] model:', model);
    console.log('[CARBON DEBUG] input tokens:', tokens.length);
    console.log('[CARBON DEBUG] co2eFactor:', co2eFactor);
    console.log('[CARBON DEBUG] total tokens:', totalTokens);
    console.log('[CARBON DEBUG] raw CO2e:', rawCo2e);
    setCo2e(rawCo2e);
    setCo2eFallback(usedFallback);
  }, [pricing, model, tokens]);

  return (
    <div>
      <h1 className="text-3xl font-semibold mb-4">AI Carbon Footprint Estimator</h1>
      <PromptInput value={prompt} onChange={setPrompt} />
      <div className="my-4">
        <ModelSelect onChange={setModel} />
      </div>
      {co2e !== null && !isNaN(co2e) ? (
        <div className="mt-4 p-4 bg-[rgba(10,15,41,0.15)] rounded-lg">
          <p>Estimated CO₂e: <strong>
            {co2e >= 0.0001 ? `≈ ${co2e.toFixed(4)} g` : '< 0.0001 g'}
          </strong>{co2eFallback && <span className="text-yellow-400 ml-2" title="Fallback value used">*</span>}</p>
          <p className="text-sm italic mt-2">Estimate based only on prompt token count and research-backed gCO₂e per token factors. Real-world emissions may vary.</p>
        </div>
      ) : (
        <div className="mt-4 p-4 bg-[rgba(10,15,41,0.15)] rounded-lg text-yellow-400">
          No valid carbon value for this model. Check the data source.
        </div>
      )}
    </div>
  );
}
