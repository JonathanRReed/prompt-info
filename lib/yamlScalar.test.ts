import { describe, expect, test } from 'bun:test';
import { yamlScalar } from './yamlScalar';

function roundTrip(value: string) {
  return (Bun.YAML.parse(`prompt: ${yamlScalar(value)}`) as { prompt: unknown }).prompt;
}

describe('yamlScalar', () => {
  test('quotes values YAML 1.2 would read as numbers instead of text', () => {
    for (const value of ['0x1F', '0o17', '.inf', '-.inf', '.nan', '100', '1e3', '1_000', 'true', 'No', '~']) {
      expect(yamlScalar(value).startsWith('"')).toBe(true);
      expect(roundTrip(value)).toBe(value);
    }
  });

  test('quotes a leading flow indicator and keeps punctuation, Unicode and multiline text intact', () => {
    for (const value of [',leading comma', 'a, b', 'key: value', '- item', 'multi\nline', 'tab\tsep', 'é 中文 🎉', '"quoted"', 'trailing ', ' leading', '']) {
      expect(roundTrip(value)).toBe(value);
    }
    expect(yamlScalar(',leading comma')).toBe('",leading comma"');
  });

  test('leaves ordinary prose unquoted so the YAML card stays representative', () => {
    expect(yamlScalar('Summarize the latest product launch in 3 bullet points.')).toBe('Summarize the latest product launch in 3 bullet points.');
  });
});
