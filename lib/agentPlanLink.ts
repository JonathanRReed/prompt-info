import { EFFORTS, type ReasoningEffort } from './reasoningOptions';
import type { AgentPlan } from './agentPlanner';
export type SharedAgentPlan = { version: 1; mode?: 'chat' | 'agent'; plan: AgentPlan; models: string[]; runs: number; variance: number; budget?: number };
const tokenKeys = ['instructionTokens','taskTokens','toolTokensPerStep','visibleOutputTokens','reasoningTokens'] as const;
export function parseAgentPlan(value: string): SharedAgentPlan | null {
  if (value.length > 16000) return null;
  try {
    const data = JSON.parse(value);
    if (!data || (data.mode !== undefined && data.mode !== 'chat' && data.mode !== 'agent') || data.version !== 1 || !data.plan || !Array.isArray(data.models) || data.models.length > 6
      || !data.models.every((name: unknown) => typeof name === 'string' && name.length > 0 && name.length <= 256)) return null;
    const input = data.plan;
    if (!tokenKeys.every(key => Number.isInteger(input[key]) && input[key] >= 0 && input[key] <= 10000000)
      || !Number.isInteger(input.steps) || input.steps < 1 || input.steps > 200
      || typeof input.keepHistory !== 'boolean' || typeof input.cacheEnabled !== 'boolean'
      || !Number.isFinite(input.cacheHitPct) || input.cacheHitPct < 0 || input.cacheHitPct > 100
      || !Number.isInteger(data.runs) || data.runs < 1 || data.runs > 1000000
      || !Number.isFinite(data.variance) || data.variance < 0 || data.variance > 100) return null;
    if ((data.budget !== undefined && (!Number.isFinite(data.budget) || data.budget < 0 || data.budget > 1000000))
      || (input.retries !== undefined && (!Number.isInteger(input.retries) || input.retries < 0 || input.retries > 5))) return null;
    if ((input.reasoningLow !== undefined && (!Number.isInteger(input.reasoningLow) || input.reasoningLow < 0 || input.reasoningLow > input.reasoningTokens))
      || (input.reasoningHigh !== undefined && (!Number.isInteger(input.reasoningHigh) || input.reasoningHigh < input.reasoningTokens || input.reasoningHigh > 10000000))
      || (input.reasoningEffort !== undefined && !EFFORTS.includes(input.reasoningEffort as ReasoningEffort))) return null;
    return { version: 1, mode: data.mode ?? 'agent', ...(data.budget !== undefined ? { budget: data.budget } : {}), plan: { instructionTokens: input.instructionTokens, taskTokens: input.taskTokens, toolTokensPerStep: input.toolTokensPerStep, visibleOutputTokens: input.visibleOutputTokens, reasoningTokens: input.reasoningTokens, ...(input.reasoningLow !== undefined ? { reasoningLow: input.reasoningLow } : {}), ...(input.reasoningHigh !== undefined ? { reasoningHigh: input.reasoningHigh } : {}), ...(input.reasoningEffort ? { reasoningEffort: input.reasoningEffort } : {}), steps: input.steps, keepHistory: input.keepHistory, cacheEnabled: input.cacheEnabled, cacheHitPct: input.cacheHitPct, replayReasoning: input.replayReasoning === true, ...(input.retries !== undefined ? { retries: input.retries } : {}) }, models: [...new Set<string>(data.models)], runs: data.runs, variance: data.variance };
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
