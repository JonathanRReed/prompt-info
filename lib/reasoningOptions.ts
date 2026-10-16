export const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high', 'xhigh', 'max'] as const;
export type ReasoningEffort = typeof EFFORTS[number];
export type ReasoningOptions = { supportedEfforts?: ReasoningEffort[]; defaultEffort?: ReasoningEffort; mandatory: boolean; supportsMaxTokens: boolean };
export function readReasoningOptions(value: unknown): ReasoningOptions | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const data = value as Record<string, unknown>;
  const valid = (v: unknown): v is ReasoningEffort => typeof v === 'string' && EFFORTS.includes(v as ReasoningEffort);
  const efforts = data.supported_efforts === null ? [...EFFORTS] : Array.isArray(data.supported_efforts) ? data.supported_efforts.filter(valid) : undefined;
  return { supportedEfforts: efforts?.filter(e => !(data.mandatory === true && e === 'none')), defaultEffort: valid(data.default_effort) ? data.default_effort : undefined, mandatory: data.mandatory === true, supportsMaxTokens: data.supports_max_tokens === true };
}
// Editable example workloads, never provider limits or measured averages.
export const REASONING_SCENARIOS: Record<ReasoningEffort, { low: number; base: number; high: number }> = {
  none: { low: 0, base: 0, high: 0 },
  minimal: { low: 100, base: 300, high: 1000 },
  low: { low: 300, base: 1000, high: 3000 },
  medium: { low: 1000, base: 3000, high: 8000 },
  high: { low: 3000, base: 8000, high: 20000 },
  xhigh: { low: 8000, base: 20000, high: 40000 },
  max: { low: 16000, base: 32000, high: 64000 },
};
