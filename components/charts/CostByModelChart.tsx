'use client';

import { useEffect, useId, useState } from 'react';
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
  const [activeMetric, setActiveMetric] = useState<CostMetric>(metric);

  useEffect(() => {
    setActiveMetric(metric);
  }, [metric]);

  const usableRows = rows
    .flatMap(row => {
      const value = row[activeMetric];
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
          <p className="data-label">{METRIC_LABELS[activeMetric]}</p>
          <h3 id={titleId}>Cost by model</h3>
        </div>
        <span className="chart-unit">USD</span>
      </div>

      <div className="chart-metric-picker" aria-label="Cost chart period">
        {(Object.keys(METRIC_LABELS) as CostMetric[]).map(value => (
          <button
            key={value}
            type="button"
            className={activeMetric === value ? 'is-active' : ''}
            aria-pressed={activeMetric === value}
            onClick={() => setActiveMetric(value)}
          >
            {value === 'requestCost' ? 'Request' : value === 'sessionCost' ? 'Session' : value === 'monthlyCost' ? 'Monthly' : 'Annual'}
          </button>
        ))}
      </div>

      {bars.length > 0 ? (
        <div className="cost-bar-list" aria-label={`${METRIC_LABELS[activeMetric]} comparison for ${bars.length} selected models`}>
          {bars.map((bar, index) => (
            <div className="cost-bar-row" key={bar.id}>
              <div className="cost-bar-meta">
                <span>{bar.model}</span>
                <strong>{formatUsd(bar.value)}</strong>
              </div>
              <div className="cost-bar-track" aria-hidden="true">
                <span
                  className={index === 0 ? 'cost-bar-fill is-lowest' : 'cost-bar-fill'}
                  style={{ transform: `scaleX(${bar.widthPercent / 100})` }}
                />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="chart-empty">This scenario does not have enough pricing data for a comparison.</p>
      )}

      <details className="chart-data-table">
        <summary>Cost estimate detail</summary>
        <table>
          <thead><tr><th scope="col">Model</th><th scope="col">{METRIC_LABELS[activeMetric]}</th></tr></thead>
          <tbody>
            {rows.map(row => <tr key={row.model}><th scope="row">{row.model}</th><td>{formatUsd(row[activeMetric])}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}
