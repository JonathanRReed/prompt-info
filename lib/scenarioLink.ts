import type { SessionRunMode } from './sessionMath';
import type { WorkloadCadence } from './workloadMath';

/**
 * A shareable estimate is a URL, not a file. The link carries the model set
 * and the numeric assumptions only; prompt text never leaves the browser.
 * Query keys are short so a pasted link stays readable.
 */
export type ScenarioLinkState = {
  models: string[];
  tokenizer: string;
  promptTokens: number;
  outputTokens: number;
  turns: number;
  sessionMode: SessionRunMode;
  workloadRuns: number;
  workloadCadence: WorkloadCadence;
};

export type ScenarioLinkParams = Partial<ScenarioLinkState>;

const SESSION_MODES = new Set<SessionRunMode>(['baseline', 'scenario']);
const CADENCES = new Set<WorkloadCadence>(['once', 'day', 'week', 'month']);

const integer = (value: string | null, min: number, max: number): number | undefined => {
  if (value === null || value.trim() === '') return undefined;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return undefined;
  const rounded = Math.round(parsed);
  return rounded < min || rounded > max ? undefined : rounded;
};

export function parseScenarioLink(search: string): ScenarioLinkParams {
  const params = new URLSearchParams(search);
  const out: ScenarioLinkParams = {};
  const models = (params.get('models') ?? '')
    .split(',')
    .map(model => model.trim())
    .filter(Boolean)
    .slice(0, 3);
  if (models.length) out.models = models;
  const tokenizer = params.get('tokenizer')?.trim();
  if (tokenizer) out.tokenizer = tokenizer;
  const promptTokens = integer(params.get('tokens'), 1, 10_000_000);
  if (promptTokens !== undefined) out.promptTokens = promptTokens;
  const outputTokens = integer(params.get('out'), 1, 1_000_000);
  if (outputTokens !== undefined) out.outputTokens = outputTokens;
  const turns = integer(params.get('turns'), 1, 200);
  if (turns !== undefined) out.turns = turns;
  const mode = params.get('mode');
  if (mode && SESSION_MODES.has(mode as SessionRunMode)) out.sessionMode = mode as SessionRunMode;
  const runs = integer(params.get('runs'), 1, 1_000_000);
  if (runs !== undefined) out.workloadRuns = runs;
  const cadence = params.get('cadence');
  if (cadence && CADENCES.has(cadence as WorkloadCadence)) out.workloadCadence = cadence as WorkloadCadence;
  return out;
}

export function buildScenarioLink(origin: string, state: ScenarioLinkState): string {
  const params = new URLSearchParams();
  if (state.models.length) params.set('models', state.models.join(','));
  params.set('tokenizer', state.tokenizer);
  params.set('tokens', String(state.promptTokens));
  params.set('out', String(state.outputTokens));
  params.set('turns', String(state.turns));
  params.set('mode', state.sessionMode);
  params.set('runs', String(state.workloadRuns));
  params.set('cadence', state.workloadCadence);
  return `${origin.replace(/\/$/, '')}/?${params.toString()}`;
}
