'use client';
import React from 'react';

export default function PromptInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder="Enter your prompt here..."
      className="w-full h-32 bg-sidebar bg-opacity-50 backdrop-filter backdrop-blur-sm text-gray-100 p-4 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-accentPrimary"
      spellCheck={false}
      autoCorrect="off"
      autoComplete="off"
      data-ms-editor={undefined}
    />
  );
}
