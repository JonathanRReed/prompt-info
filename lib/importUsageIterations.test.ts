import { expect, test } from 'bun:test';
import { importUsage } from './importUsage';
import { priceMeasuredUsage } from './measuredUsage';
import fixtures from '../tests/fixtures/usage-iterations.json';

// Public documentation fixtures: retain model identity and iteration categories.
// Removing the guard must expose incomplete totals to pricing and fail these tests.
const model = { pricing: { input: 0.001, output: 0.002 }, co2eFactor: 0 };
const unsupported = /Request 1:.*[Ii]teration.*not supported.*no cost/;

for (const name of ['threshold', 'advisor'] as const) {
  for (const wrapped of [true, false]) {
    test(`rejects public ${name} ${wrapped ? 'envelope' : 'raw usage'} before pricing`, () => {
      const value = wrapped ? fixtures[name] : fixtures[name].usage;
      expect(() => priceMeasuredUsage(importUsage(JSON.stringify(value)), model))
        .toThrow(unsupported);
    });
  }
}

for (const [name, iterations] of [
  ['empty', []], ['null', null], ['object', {}], ['string', 'unknown'],
] as const) {
  test(`does not accept ${name} iterations as complete totals`, () => {
    expect(() => importUsage(JSON.stringify({
      usage: { input_tokens: 10, output_tokens: 2, iterations },
    }))).toThrow(unsupported);
  });
}

for (const [name, usage] of [
  ['normalized', { input: 10, output: 2 }],
  ['OpenAI Chat Completions', { prompt_tokens: 10, completion_tokens: 2 }],
  ['Gemini generateContent', { promptTokenCount: 10, candidatesTokenCount: 2 }],
] as const) {
  test(`${name} fields cannot bypass unsupported iteration accounting`, () => {
    expect(() => importUsage(JSON.stringify({ ...usage, iterations: [] })))
      .toThrow(unsupported);
  });
}

test('an unsupported second request aborts the batch before returning a partial price', () => {
  let completed;
  expect(() => {
    completed = priceMeasuredUsage(importUsage(JSON.stringify([
      { input: 100, output: 50 }, fixtures.advisor,
    ])), model);
  }).toThrow(/Request 2:.*[Ii]teration.*not supported.*no cost/);
  expect(completed).toBeUndefined();
});
