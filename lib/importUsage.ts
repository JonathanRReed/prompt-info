import type { MeasuredRequest } from './measuredUsage';

type RecordValue = Record<string, unknown>;
const object = (value: unknown): RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as RecordValue)
    : {};
const count = (value: unknown, required = false): number => {
  if (value === undefined && !required) return 0;
  if (
    typeof value !== 'number' ||
    !Number.isInteger(value) ||
    value < 0 ||
    value > 10_000_000
  )
    throw new Error('Token counts must be whole numbers from 0 to 10,000,000.');
  return value;
};

/** Import usage records only. Retain no prompts, completions, keys or response metadata. */
export function importUsage(text: string): MeasuredRequest[] {
  if (text.length > 1_000_000)
    throw new Error('Keep the usage JSON under one million characters.');
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Paste a JSON usage object or an array of usage objects.');
  }
  const entries = Array.isArray(parsed) ? parsed : [parsed];
  if (!entries.length || entries.length > 200)
    throw new Error('Import 1–200 individual requests.');
  return entries.map((entry, index) => {
    const envelope = object(entry);
    const row = object(envelope.usage ?? envelope.usageMetadata ?? entry);
    let value: MeasuredRequest;
    try {
      if ('promptTokenCount' in row) {
        const thinking = count(row.thoughtsTokenCount);
        value = {
          input: count(row.promptTokenCount, true),
          cached: count(row.cachedContentTokenCount),
          written: 0,
          output: count(row.candidatesTokenCount, true) + thinking,
          reasoning: thinking,
        };
      } else if ('prompt_tokens' in row) {
        const details = object(row.prompt_tokens_details),
          output = object(row.completion_tokens_details);
        value = {
          input: count(row.prompt_tokens, true),
          cached: count(details.cached_tokens),
          written: count(details.cache_write_tokens),
          output: count(row.completion_tokens, true),
          reasoning: count(output.reasoning_tokens),
        };
      } else if ('input_tokens' in row) {
        const anthropic =
          'cache_read_input_tokens' in row ||
          'cache_creation_input_tokens' in row;
        const details = object(row.input_tokens_details),
          output = object(row.output_tokens_details);
        const cached = count(
          anthropic ? row.cache_read_input_tokens : details.cached_tokens,
        );
        const written = count(
          anthropic
            ? row.cache_creation_input_tokens
            : details.cache_write_tokens,
        );
        value = {
          input:
            count(row.input_tokens, true) + (anthropic ? cached + written : 0),
          cached,
          written,
          output: count(row.output_tokens, true),
          reasoning: count(output.reasoning_tokens ?? output.thinking_tokens),
        };
      } else if ('input' in row && 'output' in row) {
        value = {
          input: count(row.input, true),
          cached: count(row.cached),
          written: count(row.written),
          output: count(row.output, true),
          reasoning: count(row.reasoning),
        };
      } else
        throw new Error(
          'Unrecognized usage fields. Use OpenAI, Claude, Gemini generateContent, or the normalized input/output format.',
        );
      if (
        value.input > 10_000_000 ||
        value.output > 10_000_000 ||
        value.cached + value.written > value.input ||
        value.reasoning > value.output
      )
        throw new Error(
          'Cache counts must fit within total input, and thinking must fit within total output.',
        );
      return value;
    } catch (error) {
      throw new Error(
        `Request ${index + 1}: ${error instanceof Error ? error.message : 'Invalid usage.'}`,
      );
    }
  });
}
