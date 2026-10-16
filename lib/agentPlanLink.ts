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
  /** Tasks in a one-time batch. Only meaningful when `recurring` is false. */
  batchRuns?: number;
  /** Import notes for values an old link carried that this plan cannot hold. */
  notices?: string[];
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
      data.variance > 100 ||
      (data.batchRuns !== undefined &&
        (!Number.isInteger(data.batchRuns) ||
          data.batchRuns < 1 ||
          data.batchRuns > 1000000))
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
      ...(data.recurring !== true && data.batchRuns > 1
        ? { batchRuns: data.batchRuns }
        : {}),
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

const LEGACY_KEYS: [string, keyof ReturnType<typeof parseScenarioLink>, string][] = [
  ['models', 'models', 'models'],
  ['tokens', 'promptTokens', 'prompt tokens'],
  ['out', 'outputTokens', 'output tokens'],
  ['turns', 'turns', 'turns'],
  ['mode', 'sessionMode', 'session mode'],
  ['runs', 'workloadRuns', 'runs'],
  ['cadence', 'workloadCadence', 'cadence'],
];
const PER_MONTH = { day: 365 / 12, week: 52 / 12, month: 1 } as const;

/**
 * Preserve numeric assumptions in links from the retired session calculator.
 * A one-time batch keeps its run count as `batchRuns`; it is never turned into
 * a monthly volume or a worker count. Values the plan cannot hold are listed
 * in `notices` so the planner can show them instead of changing them silently.
 */
export function readLegacyAgentPlan(search: string): SharedAgentPlan | null {
  const old = parseScenarioLink(search);
  if (!Object.keys(old).length) return null;
  const raw = new URLSearchParams(search);
  const notices: string[] = [];
  for (const [param, key, label] of LEGACY_KEYS) {
    const value = raw.get(param);
    if (value !== null && value.trim() !== '' && old[key] === undefined)
      notices.push(
        `This older link had an unsupported ${label} value (${param}=${value.slice(0, 40)}). It was ignored and the default was used.`,
      );
  }
  const cadence = old.workloadCadence ?? 'once';
  const count = old.workloadRuns ?? 1;
  let runs = 1;
  let batchRuns: number | undefined;
  if (cadence === 'once') {
    if (count > 1) batchRuns = count;
  } else {
    const monthly = count * PER_MONTH[cadence];
    runs = Math.min(1000000, Math.max(1, Math.round(monthly)));
    if (runs !== monthly)
      notices.push(
        `This older link priced ${count.toLocaleString('en-US')} runs per ${cadence}. The planner counts tasks per month, so it uses ${runs.toLocaleString('en-US')} tasks/month${monthly > 1000000 ? ' (the maximum)' : ' (rounded)'}.`,
      );
  }
  return {
    version: 1,
    mode: 'chat',
    models: old.models ?? [],
    variance: 0,
    runs,
    recurring: cadence !== 'once',
    ...(batchRuns ? { batchRuns } : {}),
    ...(notices.length ? { notices } : {}),
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
