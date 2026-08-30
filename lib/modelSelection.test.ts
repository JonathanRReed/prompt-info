import { describe, expect, test } from 'bun:test';
import { chooseDefaultModel } from './modelSelection';

describe('chooseDefaultModel', () => {
  test('prefers a current flagship model over arbitrary API ordering', () => {
    expect(chooseDefaultModel([
      'Anthropic: Claude Fable 5',
      'OpenAI: GPT-5.6 Sol (max)',
      'Tencent: Hy4 preview',
    ])).toBe('OpenAI: GPT-5.6 Sol (max)');
  });

  test('falls back to the first available model when no preferred family is present', () => {
    expect(chooseDefaultModel(['Provider: Model A', 'Provider: Model B'])).toBe('Provider: Model A');
  });
});
