'use client';

import { useId } from 'react';
import { buildLinePoints, formatUsd } from './chartFormat';

type SessionPoint = { turn: number; cost: number };

const WIDTH = 600;
const HEIGHT = 240;
const PADDING = 24;

export function SessionAccumulationChart({
  series,
  model,
}: {
  series: SessionPoint[];
  model: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const points = buildLinePoints(series.map(point => ({ x: point.turn, y: point.cost })), WIDTH, HEIGHT, PADDING);
  const path = points.map(point => `${point.x},${point.y}`).join(' ');
  const finalCost = series.at(-1)?.cost ?? 0;

  return (
    <section className="workbench-chart" aria-labelledby={titleId}>
      <div className="chart-heading-row">
        <div>
          <p className="data-label">Session accumulation</p>
          <h3 id={titleId}>Cost by turn</h3>
        </div>
        <span className="chart-unit">{formatUsd(finalCost)} total</span>
      </div>

      {points.length > 0 ? (
        <svg
          className="session-line-chart"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-labelledby={`${titleId} ${descriptionId}`}
        >
          <desc id={descriptionId}>Cumulative session cost for {model}, from turn 1 through turn {series.length}.</desc>
          <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} className="chart-axis" />
          <polyline points={path} className="session-line" />
          {points.map((point, index) => (
            <g key={series[index].turn}>
              <circle cx={point.x} cy={point.y} r="5" className="session-point" />
              <text x={point.x} y={HEIGHT - 6} textAnchor="middle" className="session-axis-label">{series[index].turn}</text>
            </g>
          ))}
        </svg>
      ) : (
        <p className="chart-empty">Choose at least one session turn to see cumulative cost.</p>
      )}

      <details className="chart-data-table">
        <summary>Exact turn data</summary>
        <table>
          <thead><tr><th scope="col">Turn</th><th scope="col">Cumulative cost</th></tr></thead>
          <tbody>
            {series.map(point => <tr key={point.turn}><th scope="row">{point.turn}</th><td>{formatUsd(point.cost)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}
