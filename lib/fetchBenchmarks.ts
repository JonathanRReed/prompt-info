import { fetchJsonWithTimeout, isCatalogEnvelope } from './catalogContract';
import type { ArtificialAnalysisCatalogResponse, ArtificialAnalysisModel } from './artificialAnalysis';

export const CLIENT_BENCHMARK_TIMEOUT_MS = 15_000;

const NULLABLE_NUMBER_FIELDS = [
  'intelligenceIndex',
  'codingIndex',
  'agenticIndex',
  'inputPerMillion',
  'outputPerMillion',
  'cacheReadPerMillion',
  'cacheWritePerMillion',
  'benchmarkCostPerTask',
  'benchmarkTotalCost',
  'outputTokensPerSecond',
  'timeToFirstTokenSeconds',
  'timeToFirstAnswerTokenSeconds',
] as const satisfies ReadonlyArray<keyof ArtificialAnalysisModel>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/** Rebuilds one row from untrusted JSON, or null when its identity is unusable. */
function sanitizeModel(value: unknown): ArtificialAnalysisModel | null {
  if (!isRecord(value)) return null;
  if (!isNonEmptyString(value.id) || !isNonEmptyString(value.name) || !isNonEmptyString(value.displayName)) return null;
  const numbers = Object.fromEntries(NULLABLE_NUMBER_FIELDS.map(field => {
    const raw = value[field];
    // Missing evidence stays null. It is never coerced to zero, which would read as free.
    return [field, typeof raw === 'number' && Number.isFinite(raw) ? raw : null];
  })) as Pick<ArtificialAnalysisModel, typeof NULLABLE_NUMBER_FIELDS[number]>;
  return {
    id: value.id,
    name: value.name,
    displayName: value.displayName,
    slug: typeof value.slug === 'string' ? value.slug : '',
    creator: typeof value.creator === 'string' ? value.creator : '',
    lastSeen: typeof value.lastSeen === 'string' ? value.lastSeen : null,
    ...numbers,
  };
}

function isModelArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/**
 * Loads the same-origin benchmark catalog. A stalled request, an error status,
 * an unparseable body, or a payload without the catalog envelope all reject, so
 * the page keeps its dated editable presets instead of hanging or crashing.
 */
export async function fetchBenchmarkCatalog({ timeoutMs = CLIENT_BENCHMARK_TIMEOUT_MS }: { timeoutMs?: number } = {}): Promise<ArtificialAnalysisCatalogResponse> {
  const result = await fetchJsonWithTimeout(
    (input, init) => fetch(input, init),
    '/api/benchmarks',
    { headers: { Accept: 'application/json' } },
    timeoutMs,
  );
  if (!result.ok || !isCatalogEnvelope(result.body, isModelArray)) {
    throw new Error('Benchmark catalog is unavailable');
  }
  const body = result.body as unknown as Record<string, unknown> & { data: unknown[] };
  const data = body.data.map(sanitizeModel).filter((model): model is ArtificialAnalysisModel => model !== null);
  if (data.length === 0) throw new Error('Benchmark catalog has no usable models');
  return {
    ...(body as unknown as ArtificialAnalysisCatalogResponse),
    intelligenceIndexVersion: typeof body.intelligenceIndexVersion === 'number' && Number.isFinite(body.intelligenceIndexVersion)
      ? body.intelligenceIndexVersion
      : null,
    limitations: typeof body.limitations === 'string' ? body.limitations : '',
    data,
  };
}
