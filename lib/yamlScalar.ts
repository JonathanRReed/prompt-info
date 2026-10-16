// YAML 1.2 core-schema scalars that a plain (unquoted) value would be typed as:
// booleans and nulls (including YAML 1.1 yes/no/on/off that many parsers still
// honor), decimal, hex (0x), octal (0o) integers, floats, and .inf/.nan.
const TYPED_PLAIN_SCALAR = /^(?:true|false|null|~|yes|no|on|off|[-+]?(?:\d[\d_]*\.?\d*(?:[eE][-+]?\d+)?|\.\d+)|0x[0-9a-f_]+|0o[0-7_]+|[-+]?\.(?:inf)|\.nan)$/i;

/**
 * Emits a string as a YAML (and TOON key-value) scalar that parses back to the
 * same string. Quotes when the plain form would misparse: indicator or comment
 * characters, a leading indicator such as "-" or ",", control whitespace,
 * surrounding spaces, the empty string, or a value YAML would type-coerce.
 * JSON strings are valid YAML 1.2 double-quoted scalars, so JSON.stringify
 * round-trips safely.
 */
export function yamlScalar(value: string): string {
  if (/[:#?[\]{}&*!|>'"%@`\t\n\r]|^[\s\-,]|\s$|^$/.test(value)) return JSON.stringify(value);
  if (TYPED_PLAIN_SCALAR.test(value)) return JSON.stringify(value);
  return value;
}
