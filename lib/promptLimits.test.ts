import { describe, expect, test } from 'bun:test';
import { clampPrompt, MAX_PROMPT_CHARACTERS } from './promptLimits';

describe('prompt limits', () => {
  test('keeps ordinary prompts and bounds oversized pasted text', () => {
    expect(clampPrompt('hello')).toBe('hello');
    expect(clampPrompt('x'.repeat(MAX_PROMPT_CHARACTERS + 10))).toHaveLength(MAX_PROMPT_CHARACTERS);
  });
});
