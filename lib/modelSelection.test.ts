import { describe, expect, test } from 'bun:test';
import { chooseDefaultModel, chooseDefaultModels } from './modelSelection';
import type { PricingMap } from './pricingParser';

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

describe('chooseDefaultModels', () => {
  const pricing: PricingMap = {
    'OpenAI: GPT-5.6 Sol': { pricing: { input: 0.004, output: 0.02 }, co2eFactor: 0.0002 },
    'Anthropic: Claude Sonnet 5': { pricing: { input: 0.003, output: 0.015 }, co2eFactor: 0.0002 },
    'Google: Gemini 3.7 Flash': { pricing: { input: 0.00075, output: 0.00375 }, co2eFactor: 0.0002 },
  };

  test('selects credible usable models from different provider families', () => {
    expect(chooseDefaultModels([
      'Niche Labs: Preview Alias',
      'Google: Gemini 3.7 Flash',
      'Anthropic: Claude Sonnet 5',
      'OpenAI: GPT-5.6 Sol',
    ], pricing, 3)).toEqual([
      'OpenAI: GPT-5.6 Sol',
      'Anthropic: Claude Sonnet 5',
      'Google: Gemini 3.7 Flash',
    ]);
  });

  test('excludes rows without positive input and output rates', () => {
    expect(chooseDefaultModels([
      'Niche Labs: Preview Alias',
      'OpenAI: GPT-5.6 Sol',
    ], pricing, 2)).toEqual(['OpenAI: GPT-5.6 Sol']);
  });
});
