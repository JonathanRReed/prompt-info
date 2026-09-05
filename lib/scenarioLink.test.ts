import { describe, expect, test } from 'bun:test';
import { buildScenarioLink, parseScenarioLink } from './scenarioLink';

describe('scenario links', () => {
  test('round-trips the model set and numeric assumptions without prompt text', () => {
    const link = buildScenarioLink('https://prompt-info.helloworldfirm.com/', {
      models: ['openai/gpt-5.2', 'anthropic/claude-sonnet-5'],
      tokenizer: 'o200k_base',
      promptTokens: 1234,
      outputTokens: 2048,
      turns: 4,
      sessionMode: 'scenario',
      workloadRuns: 500,
      workloadCadence: 'week',
    });
    expect(link.startsWith('https://prompt-info.helloworldfirm.com/?')).toBe(true);
    expect(link).not.toContain('prompt=');
    expect(parseScenarioLink(new URL(link).search)).toEqual({
      models: ['openai/gpt-5.2', 'anthropic/claude-sonnet-5'],
      tokenizer: 'o200k_base',
      promptTokens: 1234,
      outputTokens: 2048,
      turns: 4,
      sessionMode: 'scenario',
      workloadRuns: 500,
      workloadCadence: 'week',
    });
  });

  test('drops values outside the calculator ranges and unknown enums', () => {
    expect(parseScenarioLink('?tokens=-5&out=abc&turns=999&mode=turbo&cadence=year&runs=0')).toEqual({});
    expect(parseScenarioLink('?models=a,b,c,d')).toEqual({ models: ['a', 'b', 'c'] });
  });
});
