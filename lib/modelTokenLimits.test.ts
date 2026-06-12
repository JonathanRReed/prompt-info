import { describe, expect, test } from 'bun:test';
import {
  getModelTokenizerMultiplier,
  resolveModelTokenProfile,
} from './modelTokenLimits';

describe('resolveModelTokenProfile', () => {
  test('fractional limit values below 1 do not produce a zero-token cap', () => {
    const profile = resolveModelTokenProfile('Some: Unknown Model X', { max_tokens: 0.9 });
    expect(profile.maxOutputTokens).toBeGreaterThan(0);
  });

  test('explicit OpenRouter limits win over family inference', () => {
    const profile = resolveModelTokenProfile('Anthropic: Claude Opus 4.8', {
      context_length: 1000000,
      top_provider: { context_length: 1000000, max_completion_tokens: 128000 },
    });
    expect(profile.maxOutputTokens).toBe(128000);
    expect(profile.contextWindowTokens).toBe(1000000);
    expect(profile.company).toBe('Anthropic');
  });

  test('Claude Opus 4.6-4.8 family infers a 1M context window', () => {
    for (const name of ['Anthropic: Claude Opus 4.6', 'Anthropic: Claude Opus 4.8', 'Anthropic: Claude Fable 5']) {
      const profile = resolveModelTokenProfile(name);
      expect(profile.contextWindowTokens).toBe(1000000);
      expect(profile.maxOutputTokens).toBe(128000);
    }
  });
});

describe('getModelTokenizerMultiplier', () => {
  test('OpenAI counts are exact', () => {
    expect(getModelTokenizerMultiplier('OpenAI: GPT-5.5')).toBe(1);
  });

  test('older Claude models use the legacy calibration', () => {
    expect(getModelTokenizerMultiplier('Anthropic: Claude Sonnet 4.6')).toBeCloseTo(1.16, 6);
    expect(getModelTokenizerMultiplier('Anthropic: Claude Haiku 4.5')).toBeCloseTo(1.16, 6);
  });

  test('re-tuned tokenizer models (Opus 4.7+, Fable) use the higher calibration', () => {
    expect(getModelTokenizerMultiplier('Anthropic: Claude Opus 4.7')).toBeCloseTo(1.4, 6);
    expect(getModelTokenizerMultiplier('Anthropic: Claude Opus 4.8')).toBeCloseTo(1.4, 6);
    expect(getModelTokenizerMultiplier('Anthropic: Claude Fable Latest')).toBeCloseTo(1.4, 6);
  });
});
