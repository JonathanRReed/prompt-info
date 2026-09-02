import type { PricingCatalogResponse } from '../../lib/pricingCatalog';

const SOURCE_LABELS: Record<PricingCatalogResponse['source'], string> = {
  'openrouter-live': 'OpenRouter live catalog',
  'supabase-cache': 'Project pricing cache',
  'bundled-static': 'Bundled dated catalog',
};

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'time unavailable';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    timeZoneName: 'short',
  }).format(date);
}

export function SourceStatus({
  catalog,
  modelCount,
  loading,
  error,
  onRetry,
}: {
  catalog: PricingCatalogResponse | null;
  modelCount: number;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
}) {
  if (loading && !catalog) {
    return (
      <div className="source-status is-loading" role="status" aria-live="polite">
        <span className="source-signal" aria-hidden="true" />
        <span>Pricing source: checking model rates</span>
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="source-status is-error" role="alert">
        <span className="source-signal" aria-hidden="true" />
        <span>Pricing source: unavailable. {error}</span>
        <button type="button" onClick={onRetry}>Retry</button>
      </div>
    );
  }

  return (
    <div className={`source-status is-${catalog.freshness}`} role="status" aria-live="polite">
      <span className="source-signal" aria-hidden="true" />
      <span>
        Pricing source: <strong>{SOURCE_LABELS[catalog.source]}</strong>. {modelCount.toLocaleString()} priced models. {catalog.freshness === 'static' ? 'Snapshot dated' : 'Checked'} {formatTimestamp(catalog.retrievedAt)}.
      </span>
      {catalog.isFallback && catalog.fallbackReason ? <span className="source-fallback">{catalog.fallbackReason}</span> : null}
      <a href={catalog.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
    </div>
  );
}
