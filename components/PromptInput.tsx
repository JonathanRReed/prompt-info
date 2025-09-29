'use client';
import { memo } from 'react';

function PromptInput({
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
      className="w-full h-48 resize-y rounded-xl border border-rose-highlightMed bg-rose-base p-5 text-base text-rose-text placeholder:text-rose-muted/60 transition-all duration-200 focus:border-rose-iris focus:ring-2 focus:ring-rose-iris/30 hover:border-rose-highlightHigh"
      spellCheck={false}
      autoCorrect="off"
      autoComplete="off"
      data-ms-editor={undefined}
    />
  );
}

export default memo(PromptInput);
