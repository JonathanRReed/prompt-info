'use client';

import { useId } from 'react';
import type { TokenCompositionSegment } from '../../lib/costComparison';
import { formatCompactNumber, segmentPercentages } from './chartFormat';

export function TokenCompositionChart({ segments }: { segments: TokenCompositionSegment[] }) {
  const titleId = useId();
  const calculated = segmentPercentages(segments);
  const visible = calculated.filter(segment => segment.value > 0);
  const total = calculated.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <section className="workbench-chart" aria-labelledby={titleId}>
      <div className="chart-heading-row">
        <div>
          <p className="data-label">Token composition</p>
          <h3 id={titleId}>Billable work</h3>
        </div>
        <span className="chart-unit">{formatCompactNumber(total)} token equivalents</span>
      </div>

      {visible.length > 0 ? (
        <>
          <div className="composition-bar" role="img" aria-label="Billable token composition">
            {visible.map((segment, index) => (
              <span
                key={segment.key}
                className={`composition-segment composition-${index + 1}`}
                style={{ width: `${segment.percent}%` }}
                title={`${segment.label}: ${formatCompactNumber(segment.value)}`}
              />
            ))}
          </div>
          <ul className="composition-legend">
            {visible.map((segment, index) => (
              <li key={segment.key}>
                <span className={`legend-key composition-${index + 1}`} aria-hidden="true" />
                <span>{segment.label}</span>
                <strong>{formatCompactNumber(segment.value)} · {segment.percent.toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="chart-empty">Add a prompt or token plan to see the composition.</p>
      )}

      <details className="chart-data-table">
        <summary>Token count detail</summary>
        <table>
          <thead><tr><th scope="col">Category</th><th scope="col">Token equivalents</th><th scope="col">Share</th></tr></thead>
          <tbody>
            {calculated.map(segment => (
              <tr key={segment.key}>
                <th scope="row">{segment.label}</th>
                <td>{Math.round(segment.value).toLocaleString()}</td>
                <td>{segment.percent.toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
