'use client';
import { useState, useEffect } from 'react';
import PromptInput from '../components/PromptInput';
import ModelSelect from '../components/ModelSelect';
import { encode, decode } from 'gpt-tokenizer';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('');
  const [tokens, setTokens] = useState<number[]>([]);
  const [decodedTokens, setDecodedTokens] = useState<{str: string, id: number}[]>([]);
  const [cost, setCost] = useState<number | null>(null);
  const [co2e, setCo2e] = useState<number | null>(null);
  const [co2eFallback, setCo2eFallback] = useState(false);
  const [pricing, setPricing] = useState<any>(null);

  useEffect(() => {
    // Fetch pricing from the local JSON file
    fetch('/data/llm-data.json')
      .then(res => res.json())
      .then(data => {
        setPricing(data);
      });
  }, []);

  useEffect(() => {
    if (!pricing || !model || !tokens.length) {
      setCost(null);
      setCo2e(null);
      return;
    }
    const entry = pricing[model];
    // Cost: use new structure
    let validCost = null;
    if (entry && entry.pricing && typeof entry.pricing.input === 'number' && !isNaN(entry.pricing.input)) {
      validCost = (tokens.length / 1000) * entry.pricing.input;
    }
    setCost(validCost);
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
  }, [pricing, model, tokens]);

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
          <div className="my-4">
            <ModelSelect onChange={setModel} />
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
            <div className="text-lg mt-2 text-center">
              <span className="mr-4">Total tokens: <b>{tokens.length}</b></span>
              {cost !== null && !isNaN(cost) ? (
                <span>Estimated cost: <b>${cost.toFixed(8)}</b></span>
              ) : (
                <span className="text-blue-400">Please input a prompt.</span>
              )}
              <br />
              {co2e !== null && !isNaN(co2e) && (
                <span>Estimated CO₂e: <b>{co2e.toFixed(4)} g</b>{co2eFallback && <span className="text-yellow-400" title="Fallback value used">*</span>}</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
