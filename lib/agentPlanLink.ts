import type { AgentPlan } from './agentPlanner';
export type SharedAgentPlan = { version: 1; plan: AgentPlan; models: string[]; runs: number; variance: number };
const tokenKeys = ['instructionTokens','taskTokens','toolTokensPerStep','visibleOutputTokens','reasoningTokens'] as const;
export function parseAgentPlan(value: string): SharedAgentPlan | null {
  if (value.length > 16000) return null;
  try {
    const data = JSON.parse(value);
    if (!data || data.version !== 1 || !data.plan || !Array.isArray(data.models) || data.models.length > 6
      || !data.models.every((name: unknown) => typeof name === 'string' && name.length > 0 && name.length <= 256)) return null;
    const input = data.plan;
    if (!tokenKeys.every(key => Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 10000000)
      || !Number.isInteger(input.steps) || input.steps < 1 || input.steps > 200
      || typeof input.keepHistory !== 'boolean' || typeof input.cacheEnabled !== 'boolean'
      || !Number.isFinite(input.cacheHitPct) || input.cacheHitPct < 0 || input.cacheHitPct > 100
      || !Number.isInteger(data.runs) || data.runs < 1 || data.runs > 1000000
      || !Number.isFinite(data.variance) || data.variance < 0 || data.variance > 100) return null;
    return { version: 1, plan: { instructionTokens: input.instructionTokens, taskTokens: input.taskTokens, toolTokensPerStep: input.toolTokensPerStep, visibleOutputTokens: input.visibleOutputTokens, reasoningTokens: input.reasoningTokens, steps: input.steps, keepHistory: input.keepHistory, cacheEnabled: input.cacheEnabled, cacheHitPct: input.cacheHitPct, replayReasoning: input.replayReasoning === true }, models: [...new Set<string>(data.models)], runs: data.runs, variance: data.variance };
  } catch { return null; }
}
export function readAgentPlanHash(hash: string): SharedAgentPlan | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('plan');
  return value ? parseAgentPlan(value) : null;
}
export function buildAgentPlanLink(origin: string, value: SharedAgentPlan): string | null {
  const validated = parseAgentPlan(JSON.stringify(value));
  return validated ? `${origin}/agent-planner/#${new URLSearchParams({ plan: JSON.stringify(validated) })}` : null;
}
