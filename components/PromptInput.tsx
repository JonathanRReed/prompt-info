'use client';
import React from 'react';

export default function PromptInput({
  value,
  onChange,
  id = 'prompt-input',
}: {
  value: string;
  onChange: (v: string) => void;
  id?: string;
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Enter your prompt here..."
      className="w-full h-40 resize-y rounded-2xl border border-slate-700 bg-slate-900/70 p-4 text-slate-100 shadow-[0_10px_40px_-30px_rgba(15,23,42,0.8)] transition focus:border-accentPrimary focus:ring-4 focus:ring-accentPrimary/30"
      spellCheck={false}
      autoCorrect="off"
      autoComplete="off"
      data-ms-editor={undefined}
    />
  );
}
