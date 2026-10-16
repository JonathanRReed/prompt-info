import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const ADVISORY = 'https://github.com/advisories/GHSA-vfj7-8cjw-p6xm';
export const EXPIRES_AT = '2026-10-20T05:00:00.000Z';
const FIELDS = ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies'];
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const fail = message => { throw new Error(`Dependency audit blocked: ${message}`); };
function packageSegments(key) {
  const parts = key.split('/');
  const packages = [];
  for (let i = 0; i < parts.length; i++) {
    packages.push(parts[i].startsWith('@') ? `${parts[i]}/${parts[++i]}` : parts[i]);
  }
  return packages;
}

function resolveLockedPackage(packages, parent, dependency) {
  const parents = parent ? packageSegments(parent) : [];
  while (true) {
    const candidate = [...parents, dependency].join('/');
    if (Object.hasOwn(packages, candidate)) return candidate;
    if (!parents.length) return null;
    parents.pop();
  }
}

export function collectConsumerGraph(lock) {
  if (!isRecord(lock) || !isRecord(lock.packages) || !isRecord(lock.workspaces)) fail('invalid lockfile');
  const targets = Object.entries(lock.packages).filter(([, entry]) => Array.isArray(entry) && typeof entry[0] === 'string' && entry[0].startsWith('braces@'));
  if (targets.length !== 1 || targets[0][0] !== 'braces' || targets[0][1][0] !== 'braces@3.0.3') fail('unexpected locked braces version or alias');
  const edges = [];
  const addEdges = (parent, metadata, scope) => {
    if (!isRecord(metadata)) fail('invalid dependency metadata');
    for (const field of FIELDS) {
      if (metadata[field] === undefined) continue;
      if (!isRecord(metadata[field])) fail('invalid dependency metadata');
      for (const [name, requested] of Object.entries(metadata[field])) {
        if (typeof requested !== 'string') fail('invalid dependency range');
        const child = resolveLockedPackage(lock.packages, scope, name);
        if (child) edges.push([parent, field, name, requested, child]);
        else if (name === 'braces' || requested.startsWith('npm:braces@')) fail('unresolved braces consumer');
      }
    }
  };
  for (const [key, entry] of Object.entries(lock.packages)) {
    if (!Array.isArray(entry) || typeof entry[0] !== 'string') fail('invalid locked package');
    addEdges(key, entry[2] || {}, key);
  }
  for (const [key, workspace] of Object.entries(lock.workspaces)) addEdges(`workspace:${key}`, workspace, '');
  const consumers = new Set(['braces']);
  const acceptedEdges = new Map();
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (!consumers.has(edge[4])) continue;
      acceptedEdges.set(JSON.stringify(edge), edge);
      if (!consumers.has(edge[0])) {
        consumers.add(edge[0]);
        changed = true;
      }
    }
  }
  const sort = entries => entries.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), 'en'));
  return {
    nodes: sort([...consumers].filter(key => !key.startsWith('workspace:')).map(key => [key, lock.packages[key][0]])),
    edges: sort([...acceptedEdges.values()]),
  };
}

export function validateReport({ report, status, stderr = '', productionReport, productionStatus, productionStderr = '', graph, policy, now = new Date() }) {
  if (stderr.trim() || productionStderr.trim()) fail('audit process reported errors');
  if (!isRecord(report) || !isRecord(productionReport) || ![0, 1].includes(status)) fail('malformed report or failed process');
  if (productionStatus !== 0 || Object.keys(productionReport).length) fail('production dependencies must have no findings');
  if (!Object.keys(report).length) {
    if (status !== 0) fail('audit request failed');
    return false;
  }
  const findings = report.braces;
  if (status !== 1 || Object.keys(report).length !== 1 || !Array.isArray(findings) || findings.length !== 1) fail('unapproved advisory');
  const finding = findings[0];
  if (!isRecord(finding) || finding.id !== 1240992 || finding.url !== ADVISORY || finding.severity !== 'high' || finding.vulnerable_versions !== '<=3.0.3') fail('unapproved advisory');
  if (!isRecord(policy) || policy.expiresAt !== EXPIRES_AT || !Number.isFinite(now.getTime()) || now.getTime() >= Date.parse(EXPIRES_AT)) fail('exception expired or invalid');
  if (!isRecord(graph) || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges) || !isRecord(policy.consumerGraph)) fail('invalid consumer graph');
  if (JSON.stringify(graph) !== JSON.stringify(policy.consumerGraph)) fail('dependency consumer graph changed');
  return true;
}

function audit(production = false) {
  const result = spawnSync('bun', ['audit', ...(production ? ['--production'] : []), '--json'], { encoding: 'utf8', timeout: 60000 });
  if (result.error || result.signal) fail('audit command could not finish');
  let report;
  try { report = JSON.parse(result.stdout); } catch { fail('invalid JSON response'); }
  return { report, status: result.status, stderr: result.stderr };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const full = audit();
    const production = audit(true);
    const policy = JSON.parse(readFileSync(new URL('../docs/dependency-exception.json', import.meta.url), 'utf8'));
    const graph = Object.keys(full.report).length ? collectConsumerGraph(Bun.JSONC.parse(readFileSync('bun.lock', 'utf8'))) : null;
    const accepted = validateReport({ ...full, productionReport: production.report, productionStatus: production.status, productionStderr: production.stderr, graph, policy });
    console.log(accepted ? `Temporary build-only braces advisory exception, expires ${EXPIRES_AT}; production audit clean. Every other advisory blocks.` : 'Dependency audits clean.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
