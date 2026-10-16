import { formatUsd } from '../components/charts/chartFormat';

export type PlannerVolume =
  | { kind: 'single' }
  | {
      kind: 'batch' | 'monthly';
      count: number;
      /** Heading shown next to the multiplied total. */
      label: string;
      total: number | null;
      range: [number, number] | null;
      /** One receipt line: label and total. */
      line: string;
    };

const count = (value: number) => value.toLocaleString('en-US');

/**
 * Scale a per-task estimate to the volume the plan charges for. A recurring
 * plan is a monthly projection. A non-recurring plan with more than one task
 * is a one-time batch: it is multiplied once and never labelled as monthly.
 */
export function plannerVolume(input: {
  cost: number | null;
  scenarioCosts: number[];
  recurring: boolean;
  runs: number;
  batchRuns: number;
}): PlannerVolume {
  const n = input.recurring ? input.runs : input.batchRuns;
  if (!input.recurring && !(n > 1)) return { kind: 'single' };
  const valid = Number.isInteger(n) && n > 0 && n <= 1000000;
  const kind = input.recurring ? 'monthly' : 'batch';
  const label =
    kind === 'monthly'
      ? `${count(n)} tasks/month`
      : `One-time batch of ${count(n)} tasks`;
  const total =
    valid && input.cost !== null && Number.isFinite(input.cost)
      ? input.cost * n
      : null;
  const range: [number, number] | null =
    valid && input.scenarioCosts.length === 3
      ? [Math.min(...input.scenarioCosts) * n, Math.max(...input.scenarioCosts) * n]
      : null;
  return {
    kind,
    count: n,
    label,
    total,
    range,
    line: `${label}: ${formatUsd(total)}${kind === 'batch' && range ? ` (range ${formatUsd(range[0])} – ${formatUsd(range[1])})` : ''}`,
  };
}
