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
    <div className="max-w-2xl mx-auto bg-[rgba(10,15,41,0.25)] rounded-xl shadow-lg p-6 backdrop-blur-md border border-cyan-400">
      <h1 className="text-3xl font-bold mb-4 text-cyan-300 drop-shadow">BPE Merge Step Demonstrator</h1>
      <PromptInput value={prompt} onChange={setPrompt} />
      <button
        className="px-4 py-2 mt-4 bg-accentGold text-black font-semibold rounded shadow hover:scale-105 transition"
        onClick={handleStart}
      >
        Show BPE Tokens
      </button>
      {showTokens && (
        <div className="mt-6">
          <div className="flex flex-wrap gap-2 justify-center p-4 bg-[rgba(10,15,41,0.25)] rounded-lg border border-cyan-800 animate-fade-in">
            {tokens.map((tok, i) => (
              <span key={i} className="px-3 py-2 rounded-lg bg-cyan-900 text-cyan-100 text-lg font-mono shadow neon-glow">
                {tok}
              </span>
            ))}
          </div>
          <button onClick={handleReset} className="mt-4 px-3 py-1 rounded bg-cyan-700 text-white">Reset</button>
          <p className="mt-4 text-cyan-100 text-center italic">
            This shows the final BPE tokens for your prompt.<br />
            <span className="text-cyan-300">•</span> Intermediate merge steps are not available in this tokenizer.<br />
            <span className="text-cyan-300">•</span> Each box is a token as used by GPT models.<br />
          </p>
        </div>
      )}
      <div className="mt-8 p-4 bg-[rgba(10,15,41,0.15)] rounded-lg text-cyan-200">
        <b>Legend:</b> <br />
        <span className="text-cyan-300">•</span> Enter a prompt and click Show BPE Tokens.<br />
        <span className="text-cyan-300">•</span> Each box is a token (numbered ID).<br />
        <span className="text-cyan-300">•</span> The actual BPE merge process is internal to the tokenizer.<br />
      </div>
    </div>
  );
}
