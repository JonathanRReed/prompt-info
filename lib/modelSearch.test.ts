import { describe, expect, test } from 'bun:test';
import { describeModelSearch, MAX_VISIBLE_MODEL_RESULTS, searchModels } from './modelSearch';

const catalog = Array.from({ length: 200 }, (_, index) => `Provider ${index % 7}: Model ${index}`);

describe('searchModels', () => {
  test('counts every match even when only the first 80 render', () => {
    const { results, total, truncated } = searchModels(catalog, 'model');
    expect(results).toHaveLength(MAX_VISIBLE_MODEL_RESULTS);
    expect(total).toBe(200);
    expect(truncated).toBe(true);
  });

  test('matches separators and word order loosely across old, modern and suffixed names', () => {
    const models = ['OpenAI: GPT-4o', 'OpenAI: GPT-4o mini', 'OpenAI: GPT-3.5 Turbo', 'Meta: Llama 3.1 8B Instruct (free)'];
    expect(searchModels(models, 'gpt 4o').results).toEqual(['OpenAI: GPT-4o', 'OpenAI: GPT-4o mini']);
    expect(searchModels(models, 'gpt-3.5').results).toEqual(['OpenAI: GPT-3.5 Turbo']);
    expect(searchModels(models, 'instruct llama').total).toBe(1);
    expect(searchModels(models, 'claude').total).toBe(0);
  });

  test('searches display labels when model ids are opaque', () => {
    const result = searchModels(['aa-1', 'aa-2'], 'sonnet', { 'aa-1': 'Anthropic: Claude Sonnet 5', 'aa-2': 'OpenAI: GPT-5.6' });
    expect(result).toEqual({ results: ['aa-1'], total: 1, truncated: false });
  });
});

describe('describeModelSearch', () => {
  test('reports the real total and the cap separately', () => {
    expect(describeModelSearch({ query: 'a', shown: 80, total: 386, catalogSize: 435, curated: true }))
      .toBe('Showing 80 of 386 matches. Refine to narrow.');
    expect(describeModelSearch({ query: 'gpt-4o', shown: 5, total: 5, catalogSize: 435, curated: true })).toBe('5 matches');
    expect(describeModelSearch({ query: 'x', shown: 1, total: 1, catalogSize: 435, curated: true })).toBe('1 match');
    expect(describeModelSearch({ query: 'zzz', shown: 0, total: 0, catalogSize: 435, curated: true })).toBe('No matches');
    expect(describeModelSearch({ query: '', shown: 12, total: 435, catalogSize: 435, curated: true }))
      .toBe('Provider-diverse browse set · 12 of 435');
  });
});
