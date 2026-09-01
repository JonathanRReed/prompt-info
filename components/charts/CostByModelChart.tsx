'use client';

import { useId } from 'react';
import type { CostComparisonRow } from '../../lib/costComparison';
import { formatUsd, scaleBars } from './chartFormat';

type CostMetric = 'requestCost' | 'sessionCost' | 'monthlyCost' | 'annualCost';

const METRIC_LABELS: Record<CostMetric, string> = {
  requestCost: 'Request cost',
  sessionCost: 'Session cost',
  monthlyCost: 'Monthly cost',
  annualCost: 'Annual cost',
};

export function CostByModelChart({
  rows,
  metric = 'sessionCost',
}: {
  rows: CostComparisonRow[];
  metric?: CostMetric;
}) {
  const titleId = useId();
  const usableRows = rows
    .flatMap(row => {
      const value = row[metric];
      return row.isUsable && typeof value === 'number' && Number.isFinite(value)
        ? [{ id: row.model, model: row.model, value }]
        : [];
    })
    .sort((a, b) => a.value - b.value || a.model.localeCompare(b.model));
  const bars = scaleBars(usableRows);

  return (
    <section className="workbench-chart" aria-labelledby={titleId}>
      <div className="chart-heading-row">
        <div>
          <p className="data-label">{METRIC_LABELS[metric]}</p>
          <h3 id={titleId}>Cost by model</h3>
        </div>
        <span className="chart-unit">USD</span>
      </div>

      {bars.length > 0 ? (
        <div className="cost-bar-list" role="img" aria-label={`${METRIC_LABELS[metric]} comparison for ${bars.length} selected models`}>
          {bars.map((bar, index) => (
            <div className="cost-bar-row" key={bar.id}>
              <div className="cost-bar-meta">
                <span>{bar.model}</span>
                <strong>{formatUsd(bar.value)}</strong>
              </div>
              <div className="cost-bar-track" aria-hidden="true">
                <span
                  className={index === 0 ? 'cost-bar-fill is-lowest' : 'cost-bar-fill'}
                  style={{ width: `${bar.widthPercent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="chart-empty">This scenario does not have enough pricing data for a comparison.</p>
      )}

      <details className="chart-data-table">
        <summary>Exact cost data</summary>
        <table>
          <thead><tr><th scope="col">Model</th><th scope="col">{METRIC_LABELS[metric]}</th></tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.model}><th scope="row">{row.model}</th><td>{formatUsd(row[metric])}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}
