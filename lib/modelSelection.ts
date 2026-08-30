const DEFAULT_MODEL_PREFERENCES = [
  /openai:\s*gpt-5\.6\s+sol/i,
  /openai:\s*gpt-5/i,
  /anthropic:\s*claude.*sonnet/i,
  /google:\s*gemini.*flash/i,
];

export function chooseDefaultModel(models: string[]) {
  for (const preference of DEFAULT_MODEL_PREFERENCES) {
    const match = models.find(model => preference.test(model));
    if (match) return match;
  }

  return models[0] ?? '';
}
