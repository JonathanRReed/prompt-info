'use client';

import { memo } from 'react';
import { MAX_PROMPT_CHARACTERS } from '../lib/promptLimits';

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
      maxLength={MAX_PROMPT_CHARACTERS}
      placeholder="Paste prompt text for analysis"
      className="h-36 w-full resize-y border border-rose-highlightMed bg-rose-surface p-4 font-mono text-sm leading-7 text-rose-text placeholder:text-rose-muted transition duration-200 hover:border-rose-highlightHigh focus:border-rose-love focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none sm:h-40"
      spellCheck={false}
      autoCorrect="off"
      autoComplete="off"
      data-ms-editor={undefined}
    />
  );
}

export default memo(PromptInput);
