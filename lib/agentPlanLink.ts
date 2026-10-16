import { parseScenarioLink } from './scenarioLink';
import { EFFORTS, type ReasoningEffort } from './reasoningOptions';
import type { AgentPlan } from './agentPlanner';
export type SharedAgentPlan = {
  version: 1;
  mode?: 'chat' | 'agent';
  plan: AgentPlan;
  models: string[];
  runs: number;
  variance: number;
  budget?: number;
  recurring?: boolean;
  budgetEnabled?: boolean;
};
const tokenKeys = [
  'instructionTokens',
  'taskTokens',
  'toolTokensPerStep',
  'visibleOutputTokens',
  'reasoningTokens',
] as const;
export function parseAgentPlan(value: string): SharedAgentPlan | null {
  if (value.length > 16000) return null;
  try {
    const data = JSON.parse(value);
    if (
      !data ||
      (data.recurring !== undefined && typeof data.recurring !== 'boolean') ||
      (data.budgetEnabled !== undefined &&
        typeof data.budgetEnabled !== 'boolean') ||
      (data.mode !== undefined &&
        data.mode !== 'chat' &&
        data.mode !== 'agent') ||
      data.version !== 1 ||
      !data.plan ||
      !Array.isArray(data.models) ||
      data.models.length > 6 ||
      !data.models.every(
        (name: unknown) =>
          typeof name === 'string' && name.length > 0 && name.length <= 256,
      )
    )
      return null;
    const input = data.plan;
    if (
      !tokenKeys.every(
        (key) =>
          Number.isInteger(input[key]) &&
          input[key] >= 0 &&
          input[key] <= 10000000,
      ) ||
      !Number.isInteger(input.steps) ||
      input.steps < 1 ||
      input.steps > 1000000 ||
      (input.steps > 200 &&
        input.keepHistory &&
        input.compactEvery === undefined) ||
      typeof input.keepHistory !== 'boolean' ||
      typeof input.cacheEnabled !== 'boolean' ||
      !Number.isFinite(input.cacheHitPct) ||
      input.cacheHitPct < 0 ||
      input.cacheHitPct > 100 ||
      !Number.isInteger(data.runs) ||
      data.runs < 1 ||
      data.runs > 1000000 ||
      !Number.isFinite(data.variance) ||
      data.variance < 0 ||
      data.variance > 100
    )
      return null;
    if (
      (data.budget !== undefined &&
        (!Number.isFinite(data.budget) ||
          data.budget < 0 ||
          data.budget > 1000000)) ||
      (input.retries !== undefined &&
        (!Number.isInteger(input.retries) ||
          input.retries < 0 ||
          input.retries > 5))
    )
      return null;
    if (
      (input.compactEvery !== undefined &&
        (!Number.isInteger(input.compactEvery) ||
          input.compactEvery < 1 ||
          input.compactEvery > 200 ||
          !Number.isInteger(input.summaryTokens) ||
          input.summaryTokens < 1 ||
          input.summaryTokens > 10000000 ||
          !input.keepHistory)) ||
      (input.workers !== undefined &&
        (!Number.isInteger(input.workers) ||
          input.workers < 1 ||
          input.workers > 100)) ||
      (input.stepsLow !== undefined &&
        (!Number.isInteger(input.stepsLow) ||
          input.stepsLow < 1 ||
          input.stepsLow > input.steps)) ||
      (input.stepsHigh !== undefined &&
        (!Number.isInteger(input.stepsHigh) ||
          input.stepsHigh < input.steps ||
          input.stepsHigh > 1000000))
    )
      return null;
    if (
      (input.reasoningLow !== undefined &&
        (!Number.isInteger(input.reasoningLow) ||
          input.reasoningLow < 0 ||
          input.reasoningLow > input.reasoningTokens)) ||
      (input.reasoningHigh !== undefined &&
        (!Number.isInteger(input.reasoningHigh) ||
          input.reasoningHigh < input.reasoningTokens ||
          input.reasoningHigh > 10000000)) ||
      (input.reasoningEffort !== undefined &&
        !EFFORTS.includes(input.reasoningEffort as ReasoningEffort))
    )
      return null;
    return {
      version: 1,
      recurring: data.recurring === true,
      budgetEnabled: data.budgetEnabled === true,
      mode: data.mode ?? 'agent',
      ...(data.budget !== undefined ? { budget: data.budget } : {}),
      plan: {
        instructionTokens: input.instructionTokens,
        taskTokens: input.taskTokens,
        toolTokensPerStep: input.toolTokensPerStep,
        visibleOutputTokens: input.visibleOutputTokens,
        reasoningTokens: input.reasoningTokens,
        ...(input.reasoningLow !== undefined
          ? { reasoningLow: input.reasoningLow }
          : {}),
        ...(input.reasoningHigh !== undefined
          ? { reasoningHigh: input.reasoningHigh }
          : {}),
        ...(input.reasoningEffort
          ? { reasoningEffort: input.reasoningEffort }
          : {}),
        steps: input.steps,
        ...(input.compactEvery !== undefined
          ? {
              compactEvery: input.compactEvery,
              summaryTokens: input.summaryTokens,
            }
          : {}),
        ...(input.workers !== undefined ? { workers: input.workers } : {}),
        ...(input.stepsLow !== undefined ? { stepsLow: input.stepsLow } : {}),
        ...(input.stepsHigh !== undefined
          ? { stepsHigh: input.stepsHigh }
          : {}),
        keepHistory: input.keepHistory,
        cacheEnabled: input.cacheEnabled,
        cacheHitPct: input.cacheHitPct,
        replayReasoning: input.replayReasoning === true,
        ...(input.retries !== undefined ? { retries: input.retries } : {}),
      },
      models: [...new Set<string>(data.models)],
      runs: data.runs,
      variance: data.variance,
    };
  } catch {
    return null;
  }
}
export function readAgentPlanHash(hash: string): SharedAgentPlan | null {
  const value = new URLSearchParams(hash.replace(/^#/, '')).get('plan');
  return value ? parseAgentPlan(value) : null;
}
export function buildAgentPlanLink(
  origin: string,
  value: SharedAgentPlan,
): string | null {
  const validated = parseAgentPlan(JSON.stringify(value));
  return validated
    ? `${origin}/#${new URLSearchParams({ plan: JSON.stringify(validated) })}`
    : null;
}

/** Preserve numeric assumptions in links from the retired session calculator. */
export function readLegacyAgentPlan(search: string): SharedAgentPlan | null {
  const old = parseScenarioLink(search);
  if (!Object.keys(old).length) return null;
  const cadence = old.workloadCadence ?? 'once';
  const monthly =
    (old.workloadRuns ?? 1) *
    (cadence === 'day' ? 365 / 12 : cadence === 'week' ? 52 / 12 : 1);
  return {
    version: 1,
    mode: 'chat',
    models: old.models ?? [],
    variance: 0,
    runs: Math.min(1000000, Math.round(monthly)),
    recurring: cadence !== 'once',
    budgetEnabled: false,
    plan: {
      instructionTokens: 0,
      taskTokens: old.promptTokens ?? 500,
      toolTokensPerStep: 0,
      visibleOutputTokens: old.outputTokens ?? 2048,
      reasoningTokens: 0,
      steps: old.turns ?? 1,
      keepHistory: old.sessionMode === 'scenario',
      cacheEnabled: false,
      cacheHitPct: 0,
    },
  };
}
