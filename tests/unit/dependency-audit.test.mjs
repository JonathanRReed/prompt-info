import { expect, test } from 'bun:test';
import { validateReport, EXPIRES_AT } from '../../scripts/dependency-audit.mjs';
const finding = { id: 1240992, url: 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm', severity: 'high', vulnerable_versions: '<=3.0.3' };
const graph = { nodes: [['braces','braces@3.0.3']], edges: [] };
const valid = { report: { braces: [finding] }, status: 1, productionReport: {}, productionStatus: 0, graph, policy: { expiresAt: EXPIRES_AT, consumerGraph: graph }, now: new Date('2026-10-16T00:00:00Z') };
test('only the approved build-only advisory is accepted before expiry', () => {
  expect(validateReport(valid)).toBe(true);
  expect(validateReport({ ...valid, report: {}, status: 0, now: new Date('2030-01-01') })).toBe(false);
});
test('exceptions fail closed at expiry and for every other risk or process failure', () => {
  for (const change of [
    { now: new Date(EXPIRES_AT) }, { now: new Date('invalid') },
    { report: [] }, { report: {}, status: 1 }, { status: 2 }, { stderr: 'network error' },
    { productionReport: { braces: [finding] }, productionStatus: 1 },
    { productionStatus: 1 }, { productionStderr: 'error' },
    { report: { braces: [{ ...finding, url: 'different' }] } },
    { report: { braces: [finding, finding] } },
    { report: { braces: [finding], other: [{ severity: 'low' }] } },
    { graph: { ...graph, nodes: [['braces', 'braces@3.0.2']] } },
    { policy: { ...valid.policy, expiresAt: '2030-01-01' } },
    { graph: undefined, policy: { expiresAt: EXPIRES_AT } },
  ]) expect(() => validateReport({ ...valid, ...change })).toThrow();
});
