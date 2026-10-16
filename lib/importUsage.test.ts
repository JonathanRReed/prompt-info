import { expect, test } from 'bun:test';
import { importUsage } from './importUsage';
test('normalizes inclusive OpenAI counts without double billing thinking or cache', () => {
  expect(
    importUsage(
      JSON.stringify({
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
          input_tokens_details: { cached_tokens: 800 },
          output_tokens_details: { reasoning_tokens: 300 },
        },
      }),
    ),
  ).toEqual([
    { input: 1000, cached: 800, written: 0, output: 500, reasoning: 300 },
  ]);
});
test('Claude separate cache buckets become inclusive input', () => {
  expect(
    importUsage(
      JSON.stringify({
        input_tokens: 200,
        cache_read_input_tokens: 800,
        cache_creation_input_tokens: 100,
        output_tokens: 500,
      }),
    )[0],
  ).toEqual({
    input: 1100,
    cached: 800,
    written: 100,
    output: 500,
    reasoning: 0,
  });
});
test('Gemini adds generated thinking to candidates only once', () => {
  expect(
    importUsage(
      JSON.stringify({
        usageMetadata: {
          promptTokenCount: 1000,
          candidatesTokenCount: 200,
          thoughtsTokenCount: 300,
          totalTokenCount: 1500,
        },
      }),
    )[0],
  ).toEqual({
    input: 1000,
    cached: 0,
    written: 0,
    output: 500,
    reasoning: 300,
  });
});
test('unknown or incomplete usage fails instead of inventing free output', () => {
  for (const value of [
    {},
    { input_tokens: 100 },
    { promptTokenCount: 100 },
    { input: 10, output: 5, reasoning: 6 },
    { input: 10, output: 5, cached: 11 },
    [],
    Array(201).fill({ input: 0, output: 0 }),
  ])
    expect(() => importUsage(JSON.stringify(value))).toThrow();
  expect(() => importUsage('bad')).toThrow();
});
test('imports arrays and drops all text and metadata', () => {
  const result = importUsage(
    JSON.stringify([
      { input: 100, output: 50, prompt: 'PRIVATE' },
      {
        usage: {
          prompt_tokens: 200,
          completion_tokens: 60,
          completion_tokens_details: { reasoning_tokens: 20 },
        },
      },
    ]),
  );
  expect(result).toHaveLength(2);
  expect(JSON.stringify(result)).not.toContain('PRIVATE');
  expect(result[1].reasoning).toBe(20);
});

test('Gemini includes tool-provided input and preserves prompt cache as a subset', () => {
  const usageMetadata = {
    promptTokenCount: 27, toolUsePromptTokenCount: 10309,
    candidatesTokenCount: 45, thoughtsTokenCount: 31,
    cachedContentTokenCount: 20, totalTokenCount: 10412,
  };
  expect(importUsage(JSON.stringify({ usageMetadata }))[0]).toEqual({
    input: 10336, cached: 20, written: 0, output: 76, reasoning: 31,
  });
});

test('Gemini validates tool counts, combined bounds, and cache against original prompt', () => {
  for (const patch of [
    { toolUsePromptTokenCount: -1 }, { toolUsePromptTokenCount: 1.5 },
    { toolUsePromptTokenCount: '100' }, { toolUsePromptTokenCount: 10000001 },
    { promptTokenCount: 10000000, toolUsePromptTokenCount: 1 },
    { cachedContentTokenCount: 28, toolUsePromptTokenCount: 100 },
  ]) expect(() => importUsage(JSON.stringify({
    promptTokenCount: 27, candidatesTokenCount: 45, ...patch,
  }))).toThrow();
});

test('Gemini supplied totals must reconcile without inferring missing categories', () => {
  for (const totalTokenCount of [100, -1, 1.5, '10412', null]) {
    expect(() => importUsage(JSON.stringify({
      promptTokenCount: 27, toolUsePromptTokenCount: 10309,
      candidatesTokenCount: 45, thoughtsTokenCount: 31, totalTokenCount,
    }))).toThrow(/total/i);
  }
  expect(importUsage(JSON.stringify({
    promptTokenCount: 10000000, candidatesTokenCount: 10000000,
    totalTokenCount: 20000000,
  }))[0].input).toBe(10000000);
});

test('recognizable Gemini Interactions records fail explicitly rather than lose tokens', () => {
  for (const extra of [{ tool_use_input_tokens: 10309 }, { thoughts_tokens: 31 }]) {
    for (const wrapped of [false, true]) {
      const usage = { input_tokens: 27, output_tokens: 45, ...extra };
      expect(() => importUsage(JSON.stringify(wrapped ? { usage } : usage)))
        .toThrow(/Gemini Interactions/);
    }
  }
});
