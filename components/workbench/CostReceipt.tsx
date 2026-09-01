'use client';

import type { CostComparisonRow, CostRecommendation } from '../../lib/costComparison';
import type { PricingCatalogResponse } from '../../lib/pricingCatalog';
import { formatUsd } from '../charts/chartFormat';

export function CostReceipt({
  row,
  recommendation,
  catalog,
  onCopy,
  onExport,
  copyState,
}: {
  row: CostComparisonRow | null;
  recommendation: CostRecommendation | null;
  catalog: PricingCatalogResponse | null;
  onCopy: () => void;
  onExport: () => void;
  copyState: 'idle' | 'copied' | 'error';
}) {
  return (
    <aside className="cost-receipt" aria-labelledby="receipt-heading">
      <div className="receipt-topline">
        <p>Live planning receipt</p>
        <span>{catalog?.freshness ?? 'loading'}</span>
      </div>
      <h2 id="receipt-heading">{row?.model ?? 'Loading model'}</h2>
      <div className="receipt-primary-total">
        <span>Session cost</span>
        <output data-testid="primary-session-cost" aria-live="polite">{formatUsd(row?.sessionCost)}</output>
      </div>
      <dl className="receipt-total-grid">
        <div><dt>One request</dt><dd>{formatUsd(row?.requestCost)}</dd></div>
        <div><dt>Monthly</dt><dd>{formatUsd(row?.monthlyCost)}</dd></div>
        <div><dt>Annual</dt><dd>{formatUsd(row?.annualCost)}</dd></div>
      </dl>
      {recommendation ? (
        <p className="receipt-criterion">
          <strong>{recommendation.model}</strong> is the {recommendation.criterion.toLowerCase()}.
        </p>
      ) : (
        <p className="receipt-criterion">No unique lowest-cost model for the current comparison.</p>
      )}
      <div className="receipt-actions">
        <button type="button" onClick={onCopy} disabled={!row}>{copyState === 'copied' ? 'Copied' : copyState === 'error' ? 'Copy failed' : 'Copy receipt'}</button>
        <button type="button" onClick={onExport} disabled={!row}>Save receipt image</button>
      </div>
      <p className="receipt-footnote">Model usage only. Provider invoices can differ because tokenizers, routing, cache eligibility, and tool calls vary.</p>
    </aside>
  );
}
