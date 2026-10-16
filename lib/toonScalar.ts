// Quoting rules for a TOON key-value string, matching the reference encoder
// (@toon-format/toon 4.4.0, MIT, isSafeUnquoted/escapeString) with the default
// comma delimiter. TOON quotes differently from YAML: a comma forces quotes,
// while YAML-only forms such as 0x1F stay plain.
const TOON_NUMERIC_LIKE = /^[+-]?\d+(?:\.\d+)?(?:e[+-]?\d+)?$/i;

function isSafeUnquoted(value: string) {
  if (!value) return false;
  if (/^[ \t]|[ \t]$/.test(value)) return false;
  if (value === 'true' || value === 'false' || value === 'null' || TOON_NUMERIC_LIKE.test(value)) return false;
  if (value.includes(':') || value.includes('"') || value.includes('\\')) return false;
  if (/[[\]{}]/.test(value)) return false;
  if (/[\u0000-\u001F]/.test(value)) return false;
  if (value.includes(',')) return false;
  if (value.startsWith('-') || value.startsWith('#')) return false;
  return true;
}

function escapeString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/[\u0000-\u001F]/g, char => `\\u${char.charCodeAt(0).toString(16).padStart(4, '0')}`);
}

export function toonScalar(value: string): string {
  return isSafeUnquoted(value) ? value : `"${escapeString(value)}"`;
}
