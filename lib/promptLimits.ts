export const MAX_PROMPT_CHARACTERS = 200_000;

export function clampPrompt(value: string): string {
  return value.slice(0, MAX_PROMPT_CHARACTERS);
}
