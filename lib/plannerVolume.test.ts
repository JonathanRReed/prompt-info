import { expect, test } from 'bun:test';
import { plannerVolume } from './plannerVolume';

const costs = { cost: 0.5, scenarioCosts: [0.25, 0.5, 1] };
test('a one-time batch multiplies the total and range and is labelled one-time', () => {
  const v = plannerVolume({ ...costs, recurring: false, runs: 1, batchRuns: 10 });
  expect(v).toMatchObject({ kind: 'batch', total: 5, range: [2.5, 10], label: 'One-time batch of 10 tasks' });
  expect(v.kind !== 'single' && v.line).toBe('One-time batch of 10 tasks: $5.00 (range $2.50 – $10.00)');
  expect(v.kind !== 'single' && v.line).not.toContain('month');
});
test('a single task adds no volume line and a recurring plan stays monthly', () => {
  expect(plannerVolume({ ...costs, recurring: false, runs: 1, batchRuns: 1 })).toEqual({ kind: 'single' });
  const m = plannerVolume({ ...costs, recurring: true, runs: 304, batchRuns: 10 });
  expect(m.kind !== 'single' && m.line).toBe('304 tasks/month: $152.00');
});
test('an unavailable estimate never prints a multiplied number', () => {
  const v = plannerVolume({ cost: null, scenarioCosts: [], recurring: false, runs: 1, batchRuns: 10 });
  expect(v).toMatchObject({ kind: 'batch', total: null, range: null });
});
