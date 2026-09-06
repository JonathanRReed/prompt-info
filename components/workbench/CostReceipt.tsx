'use client';

import type { CostComparisonRow, CostRecommendation } from '../../lib/costComparison';
import type { PricingCatalogResponse } from '../../lib/pricingCatalog';
import type { WorkloadCadence } from '../../lib/workloadMath';
import { formatUsd } from '../charts/chartFormat';

const FRESHNESS_LABELS: Record<PricingCatalogResponse['freshness'], string> = {
  live: 'Live rates',
  cached: 'Cached rates',
  static: 'Dated snapshot',
};

export function CostReceipt({
  row,
  recommendation,
  catalog,
  estimateReady,
  selectedModel,
  workloadCadence,
  workloadRuns,
  onCopy,
  onExport,
  copyState,
}: {
  row: CostComparisonRow | null;
  recommendation: CostRecommendation | null;
  catalog: PricingCatalogResponse | null;
  estimateReady: boolean;
  selectedModel: string | null;
  workloadCadence: WorkloadCadence;
  workloadRuns: number;
  onCopy: () => void;
  onExport: () => void;
  copyState: 'idle' | 'copied' | 'error';
}) {
  const primaryLabel = workloadCadence === 'once' ? 'Session estimate' : 'Monthly estimate';
  const primaryValue = workloadCadence === 'once' ? row?.sessionCost : row?.monthlyCost;
  const cadenceLabel = workloadCadence === 'once' ? 'once' : `per ${workloadCadence}`;
  return (
    <aside className="cost-receipt" aria-labelledby="receipt-heading">
      <div className="receipt-topline">
        <p>Current estimate</p>
        <span>{catalog ? FRESHNESS_LABELS[catalog.freshness] : 'Loading rates'}</span>
      </div>
      <h2 id="receipt-heading">{row?.model ?? selectedModel ?? 'Pricing unavailable'}</h2>
      <div className="receipt-primary-total">
        <span>{estimateReady ? primaryLabel : 'Estimate unavailable'}</span>
        <output data-testid="primary-session-cost" aria-live="polite">{estimateReady ? formatUsd(primaryValue) : 'Unavailable'}</output>
      </div>
      <p className="receipt-scope">{estimateReady ? `${workloadRuns.toLocaleString()} runs ${cadenceLabel}.` : 'Enter a prompt and complete token counting to calculate model usage.'}</p>
      <dl className="receipt-total-grid">
        <div><dt>One request</dt><dd>{formatUsd(row?.requestCost)}</dd></div>
        <div><dt>Monthly</dt><dd>{formatUsd(row?.monthlyCost)}</dd></div>
        <div><dt>Annual</dt><dd>{formatUsd(row?.annualCost)}</dd></div>
      </dl>
      {!estimateReady ? (
        <p className="receipt-criterion">Cost totals are paused until the prompt has a valid token count.</p>
      ) : recommendation ? (
        <p className="receipt-criterion">
          Lowest estimated cost in this selection: <strong>{recommendation.model}</strong>, by {recommendation.criterion.toLowerCase()}.
        </p>
      ) : (
        <p className="receipt-criterion">The selected models are tied, unavailable, or not directly comparable on this estimate.</p>
      )}
      <div className="receipt-actions">
        <button type="button" onClick={onCopy} disabled={!row}>{copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy receipt'}</button>
        <button type="button" onClick={onExport} disabled={!row}>Save receipt image</button>
      </div>
      <p className="receipt-footnote">Model usage only. Provider invoices can differ because tokenizers, routing, cache eligibility, and tool calls vary.</p>
    </aside>
  );
}
