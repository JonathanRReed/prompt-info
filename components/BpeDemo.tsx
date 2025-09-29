'use client';
import { useState } from 'react';
import PromptInput from './PromptInput';
import { encode } from 'gpt-tokenizer';

export default function BpeDemo() {
  const [prompt, setPrompt] = useState('');
  const [showTokens, setShowTokens] = useState(false);
  const [tokens, setTokens] = useState<number[]>([]);

  const handleStart = () => {
    if (!prompt.trim()) return;
    const tks = encode(prompt);
    setTokens(tks);
    setShowTokens(true);
  };

  const handleReset = () => {
    setShowTokens(false);
    setTokens([]);
  };

  return (
    <div className="max-w-2xl mx-auto bg-rose-surface/70 rounded-3xl shadow-[0_40px_90px_-60px_rgba(25,23,36,0.9)] p-6 backdrop-blur-xl border border-rose-highlightMed/60">
      <h1 className="text-3xl font-bold mb-4 text-rose-text">BPE Merge Step Demonstrator</h1>
      <PromptInput value={prompt} onChange={setPrompt} />
      <button
        className="px-6 py-2.5 mt-4 bg-rose-iris text-rose-text font-semibold rounded-xl shadow-lg hover:bg-rose-foam hover:scale-105 transition-all"
        onClick={handleStart}
      >
        Show BPE Tokens
      </button>
      {showTokens && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2 justify-center p-4 bg-rose-overlay/50 rounded-2xl border border-rose-highlightMed">
            {tokens.map((tok, i) => (
              <span key={i} className="px-3 py-2 rounded-xl bg-rose-highlightMed text-rose-text text-lg font-mono shadow-lg border border-rose-highlightHigh">
                {tok}
              </span>
            ))}
          </div>
          <button onClick={handleReset} className="mt-4 px-4 py-2 rounded-xl bg-rose-love text-rose-text hover:bg-rose-rose transition-colors">Reset</button>
          <p className="mt-4 text-rose-subtle text-center italic">
            This shows the final BPE tokens for your prompt.<br />
            <span className="text-rose-foam">•</span> Intermediate merge steps are not available in this tokenizer.<br />
            <span className="text-rose-foam">•</span> Each box is a token as used by GPT models.<br />
          </p>
        </div>
      )}
      <div className="mt-8 p-4 bg-rose-overlay/30 rounded-2xl border border-rose-highlightMed text-rose-subtle">
        <b className="text-rose-text">Legend:</b> <br />
        <span className="text-rose-foam">•</span> Enter a prompt and click Show BPE Tokens.<br />
        <span className="text-rose-foam">•</span> Each box is a token (numbered ID).<br />
        <span className="text-rose-foam">•</span> The actual BPE merge process is internal to the tokenizer.<br />
      </div>
    </div>
  );
}
