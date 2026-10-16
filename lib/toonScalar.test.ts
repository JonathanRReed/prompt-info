import { describe, expect, test } from 'bun:test';
import { toonScalar } from './toonScalar';

// Expected strings were produced by the reference encoder,
// encode({ prompt: value }) from @toon-format/toon 4.4.0, on 2026-10-16.
const REFERENCE: Array<[string, string]> = [
  ['a, b', '"a, b"'],
  ['plain text', 'plain text'],
  ['0x1F', '0x1F'],
  [',lead', '",lead"'],
  ['x: y', '"x: y"'],
  ['multi\nline', '"multi\\nline"'],
  ['é 中文 🎉', 'é 中文 🎉'],
  ['- item', '"- item"'],
  ['true', '"true"'],
  ['05', '"05"'],
];

describe('toonScalar', () => {
  test('matches the TOON reference encoder for punctuation, Unicode and multiline prompts', () => {
    for (const [value, expected] of REFERENCE) expect(toonScalar(value)).toBe(expected);
  });

  test('quotes and escapes control characters and backslashes', () => {
    expect(toonScalar('tab\there')).toBe('"tab\\there"');
    expect(toonScalar('back\\slash')).toBe('"back\\\\slash"');
    expect(toonScalar('bell\u0007')).toBe('"bell\\u0007"');
    expect(toonScalar('')).toBe('""');
  });
});
