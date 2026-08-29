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

  test('GPT-5.6 Sol, Terra, and Luna infer the shared 5.6 family limits', () => {
    for (const name of ['OpenAI: GPT-5.6 Sol', 'OpenAI: GPT-5.6 Terra', 'OpenAI: GPT-5.6 Luna']) {
      const profile = resolveModelTokenProfile(name);
      expect(profile.company).toBe('OpenAI');
      expect(profile.contextWindowTokens).toBe(1050000);
      expect(profile.maxOutputTokens).toBe(128000);
    }
  });

  test('Claude 5 rules do not swallow the 4.5-era models', () => {
    expect(resolveModelTokenProfile('Anthropic: Claude Opus 5').contextWindowTokens).toBe(1000000);
    expect(resolveModelTokenProfile('Anthropic: Claude Sonnet 5').maxOutputTokens).toBe(128000);
    expect(resolveModelTokenProfile('Anthropic: Claude Sonnet 4.5').maxOutputTokens).toBe(64000);
    expect(resolveModelTokenProfile('Anthropic: Claude Sonnet 4.5').contextWindowTokens).toBe(200000);
  });

  test('Kimi K3 resolves as Moonshot with the 1M context and a clamped explicit cap', () => {
    const inferred = resolveModelTokenProfile('Moonshot: Kimi K3');
    expect(inferred.company).toBe('Moonshot');
    expect(inferred.contextWindowTokens).toBe(1048576);

    const explicit = resolveModelTokenProfile('Moonshot: Kimi K3', { maxOutputTokens: 1048576, contextWindowTokens: 1048576 });
    expect(explicit.maxOutputTokens).toBe(300000);
  });

  test('Grok 4.6 infers the 500K context window, other Grok 4.x keep 1M', () => {
    expect(resolveModelTokenProfile('xAI: Grok 4.6').contextWindowTokens).toBe(500000);
    expect(resolveModelTokenProfile('xAI: Grok 4.3').contextWindowTokens).toBe(1000000);
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
