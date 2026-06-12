import { describe, expect, test } from 'bun:test';
import { buildPricingMap } from './pricingParser';

// Shape mirrors a real OpenRouter /api/v1/models row (pricing is per token, as strings)
const OPUS_ROW = {
  id: 'anthropic/claude-opus-4.8',
  name: 'Anthropic: Claude Opus 4.8',
  context_length: 1000000,
  pricing: {
    prompt: '0.000005',
    completion: '0.000025',
    web_search: '0.01',
    input_cache_read: '0.0000005',
    input_cache_write: '0.00000625',
  },
  top_provider: {
    context_length: 1000000,
    max_completion_tokens: 128000,
    is_moderated: false,
  },
};

describe('buildPricingMap with OpenRouter rows', () => {
  const map = buildPricingMap([OPUS_ROW]);
  const entry = map['Anthropic: Claude Opus 4.8'];

  test('parses per-token prompt/completion prices into per-1k rates', () => {
    expect(entry).toBeDefined();
    expect(entry.pricing.input).toBeCloseTo(0.005, 10); // $5 / M
    expect(entry.pricing.output).toBeCloseTo(0.025, 10); // $25 / M
  });

  test('parses cache read/write as PER-TOKEN values, not per-million', () => {
    // $0.50 / M cache read => 0.0005 per 1k (10% of input price)
    expect(entry.pricing.inputCacheRead).toBeCloseTo(0.0005, 10);
    // $6.25 / M cache write => 0.00625 per 1k (1.25x input price)
    expect(entry.pricing.inputCacheWrite).toBeCloseTo(0.00625, 10);

    const readPct = (entry.pricing.inputCacheRead! / entry.pricing.input) * 100;
    const writeMultiplier = entry.pricing.inputCacheWrite! / entry.pricing.input;
    expect(readPct).toBeCloseTo(10, 6);
    expect(writeMultiplier).toBeCloseTo(1.25, 6);
  });

  test('resolves output limit and context window from top_provider data', () => {
    expect(entry.maxOutputTokens).toBe(128000);
    expect(entry.contextWindowTokens).toBe(1000000);
  });

  test('handles scientific-notation price strings', () => {
    const map2 = buildPricingMap([
      {
        name: 'Test: Sci Model',
        context_length: 8192,
        pricing: { prompt: '5e-6', completion: '2.5e-5' },
      },
    ]);
    const sci = map2['Test: Sci Model'];
    expect(sci.pricing.input).toBeCloseTo(0.005, 10);
    expect(sci.pricing.output).toBeCloseTo(0.025, 10);
  });

  test('drops rows without usable prices', () => {
    const map3 = buildPricingMap([
      { name: 'Broken: No Pricing', context_length: 8192, pricing: {} },
    ]);
    expect(Object.keys(map3)).toHaveLength(0);
  });

  test('keeps differently-priced qualified variants as separate entries', () => {
    const fastRow = {
      ...OPUS_ROW,
      id: 'anthropic/claude-opus-4.8-fast',
      name: 'Anthropic: Claude Opus 4.8 (Fast)',
      pricing: { ...OPUS_ROW.pricing, prompt: '0.00001', completion: '0.00005' },
    };
    const map4 = buildPricingMap([fastRow, OPUS_ROW]);
    expect(map4['Anthropic: Claude Opus 4.8']).toBeDefined();
    expect(map4['Anthropic: Claude Opus 4.8 (Fast)']).toBeDefined();
    expect(map4['Anthropic: Claude Opus 4.8 (Fast)'].pricing.input).toBeCloseTo(0.01, 10);
  });

  test('collapses same-priced qualified duplicates, preferring the unqualified name', () => {
    const snapshotRow = {
      ...OPUS_ROW,
      id: 'anthropic/claude-opus-4.8-20260115',
      name: 'Anthropic: Claude Opus 4.8 (2026-01-15)',
    };
    const map5 = buildPricingMap([snapshotRow, OPUS_ROW]);
    expect(map5['Anthropic: Claude Opus 4.8']).toBeDefined();
    expect(map5['Anthropic: Claude Opus 4.8 (2026-01-15)']).toBeUndefined();
  });
});
