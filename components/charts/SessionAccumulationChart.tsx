'use client';

import { useId, useState, type KeyboardEvent } from 'react';
import { buildLinePoints, formatUsd } from './chartFormat';

type SessionPoint = { turn: number; cost: number };

const WIDTH = 600;
const HEIGHT = 240;
const PADDING = 38;

function tickValues(min: number, max: number) {
  if (min === max) return [min];
  return [min, min + ((max - min) / 2), max];
}

function labelIndexes(length: number) {
  if (length <= 1) return length ? [0] : [];
  const step = Math.max(1, Math.ceil((length - 1) / 5));
  const indexes = Array.from({ length }, (_, index) => index).filter(index => index % step === 0);
  if (indexes.at(-1) !== length - 1) indexes.push(length - 1);
  return indexes;
}

function handlePointKeyDown(
  event: KeyboardEvent<SVGGElement>,
  index: number,
  count: number,
  select: (next: number) => void,
) {
  let next: number | null = null;
  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = Math.min(index + 1, count - 1);
  if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = Math.max(index - 1, 0);
  if (event.key === 'Home') next = 0;
  if (event.key === 'End') next = count - 1;
  if (next === null) return;
  event.preventDefault();
  select(next);
  requestAnimationFrame(() => document.getElementById(`session-point-${next}`)?.focus());
}

export function SessionAccumulationChart({
  series,
  model,
}: {
  series: SessionPoint[];
  model: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  // Until the user chooses a point, follow the latest turn as the scenario grows.
  // Once they interact, preserve that inspected turn while it remains in range.
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const minCost = Math.min(0, ...series.map(point => point.cost));
  const maxCost = Math.max(0, ...series.map(point => point.cost));
  const safeSelectedIndex = selectedIndex === null
    ? Math.max(0, series.length - 1)
    : Math.min(selectedIndex, Math.max(0, series.length - 1));
  const points = buildLinePoints(
    series.map(point => ({ x: point.turn, y: point.cost })),
    WIDTH,
    HEIGHT,
    PADDING,
    { minY: minCost, maxY: maxCost },
  );
  const path = points.map(point => `${point.x},${point.y}`).join(' ');
  const selected = series[safeSelectedIndex] ?? series.at(-1);
  const previous = selected ? series.findIndex(point => point.turn === selected.turn) : -1;
  const incremental = selected && previous > 0 ? selected.cost - (series[previous - 1]?.cost ?? 0) : selected?.cost ?? 0;
  const yTicks = tickValues(minCost, maxCost);
  const xLabels = labelIndexes(series.length);

  return (
    <section className="workbench-chart" aria-labelledby={titleId}>
      <div className="chart-heading-row">
        <div>
          <p className="data-label">Session accumulation</p>
          <h3 id={titleId}>Cost by turn</h3>
        </div>
        <span className="chart-unit">{formatUsd(series.at(-1)?.cost ?? 0)} total</span>
      </div>

      {points.length > 0 ? (
        <>
          <p className="chart-help">Select a point to inspect that turn. Use arrow keys, Home, or End to move through the session.</p>
          <div className="session-chart-frame">
            <svg
              className="session-line-chart"
              viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
              role="group"
              aria-labelledby={`${titleId} ${descriptionId}`}
            >
              <desc id={descriptionId}>Cumulative session cost for {model}, from turn 1 through turn {series.length}. Each point can be selected for its exact cumulative and incremental cost.</desc>
              {yTicks.map(value => {
                const y = maxCost === minCost
                  ? HEIGHT / 2
                  : HEIGHT - PADDING - ((value - minCost) / (maxCost - minCost)) * (HEIGHT - PADDING * 2);
                return (
                  <g key={`y-${value}`}>
                    <line x1={PADDING} y1={y} x2={WIDTH - PADDING} y2={y} className="chart-grid-line" />
                    <text x={PADDING - 8} y={y + 4} textAnchor="end" className="session-y-label">{formatUsd(value)}</text>
                  </g>
                );
              })}
              <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} className="chart-axis" />
              <polyline points={path} className="session-line" />
              {points.map((point, index) => {
                const row = series[index];
                const isSelected = index === safeSelectedIndex;
                return (
                  <g
                    key={row.turn}
                    id={`session-point-${index}`}
                    className={isSelected ? 'session-point-group is-selected' : 'session-point-group'}
                    role="button"
                    tabIndex={isSelected ? 0 : -1}
                    aria-label={`Turn ${row.turn}, ${formatUsd(row.cost)} cumulative, ${formatUsd(index > 0 ? row.cost - series[index - 1].cost : row.cost)} added`}
                    onPointerDown={() => setSelectedIndex(index)}
                    onFocus={() => setSelectedIndex(index)}
                    onKeyDown={event => handlePointKeyDown(event, index, points.length, setSelectedIndex)}
                  >
                    <circle cx={point.x} cy={point.y} r="10" className="session-point-hit-area" />
                    <circle cx={point.x} cy={point.y} r={isSelected ? 7 : 5} className="session-point" />
                    {xLabels.includes(index) ? <text x={point.x} y={HEIGHT - 12} textAnchor="middle" className="session-axis-label">{row.turn}</text> : null}
                  </g>
                );
              })}
            </svg>
          </div>
          {selected ? (
            <div className="session-selected-detail" aria-live="polite">
              <span><small>Selected turn</small><strong>{selected.turn}</strong></span>
              <span><small>Added this turn</small><strong>{formatUsd(incremental)}</strong></span>
              <span><small>Cumulative</small><strong>{formatUsd(selected.cost)}</strong></span>
            </div>
          ) : null}
        </>
      ) : (
        <p className="chart-empty">Choose at least one session turn to see cumulative cost.</p>
      )}

      <details className="chart-data-table">
        <summary>Exact turn data</summary>
        <table>
          <thead><tr><th scope="col">Turn</th><th scope="col">Added this turn</th><th scope="col">Cumulative cost</th></tr></thead>
          <tbody>
            {series.map((point, index) => <tr key={point.turn}><th scope="row">{point.turn}</th><td>{formatUsd(index > 0 ? point.cost - series[index - 1].cost : point.cost)}</td><td>{formatUsd(point.cost)}</td></tr>)}
          </tbody>
        </table>
      </details>
    </section>
  );
}
