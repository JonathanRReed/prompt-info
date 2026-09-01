export const CATALOG_SCHEMA_VERSION = 1 as const;

export type CatalogFreshness = 'live' | 'cached' | 'static';

export type CatalogEnvelope<TData, TSource extends string = string> = {
  schemaVersion: typeof CATALOG_SCHEMA_VERSION;
  data: TData;
  source: TSource;
  sourceUrl: string;
  retrievedAt: string;
  freshness: CatalogFreshness;
  isFallback: boolean;
  fallbackReason: string | null;
};

export type FetchJsonResult =
  | { ok: true; body: unknown; status: number }
  | { ok: false; reason: 'timeout' | 'network' | 'upstream' | 'invalid-json'; status?: number };

type Fetcher = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export const CATALOG_CACHE_CONTROL = 'public, max-age=900, s-maxage=21600, stale-while-revalidate=86400';

export function catalogJsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': status === 200 ? CATALOG_CACHE_CONTROL : 'no-store',
    },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isValidSourceUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;

  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

export function isCatalogEnvelope<TData>(
  value: unknown,
  isData: (data: unknown) => data is TData,
): value is CatalogEnvelope<TData> {
  if (!isRecord(value)) return false;

  return (
    value.schemaVersion === CATALOG_SCHEMA_VERSION
    && isData(value.data)
    && typeof value.source === 'string'
    && value.source.trim().length > 0
    && isValidSourceUrl(value.sourceUrl)
    && typeof value.retrievedAt === 'string'
    && Number.isFinite(Date.parse(value.retrievedAt))
    && (value.freshness === 'live' || value.freshness === 'cached' || value.freshness === 'static')
    && typeof value.isFallback === 'boolean'
    && (value.fallbackReason === null || typeof value.fallbackReason === 'string')
  );
}

export async function fetchJsonWithTimeout(
  fetcher: Fetcher,
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 6_000,
): Promise<FetchJsonResult> {
  const controller = new AbortController();
  let timedOut = false;
  const callerSignal = init.signal;
  const abortFromCaller = () => controller.abort(callerSignal?.reason);

  if (callerSignal?.aborted) {
    controller.abort(callerSignal.reason);
  } else {
    callerSignal?.addEventListener('abort', abortFromCaller, { once: true });
  }

  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort(new DOMException('Catalog request timed out', 'TimeoutError'));
  }, Math.max(1, timeoutMs));

  try {
    const response = await fetcher(input, { ...init, signal: controller.signal });
    if (!response.ok) {
      return { ok: false, reason: 'upstream', status: response.status };
    }

    try {
      return { ok: true, body: await response.json(), status: response.status };
    } catch {
      return { ok: false, reason: 'invalid-json', status: response.status };
    }
  } catch {
    return { ok: false, reason: timedOut ? 'timeout' : 'network' };
  } finally {
    clearTimeout(timeout);
    callerSignal?.removeEventListener('abort', abortFromCaller);
  }
}
