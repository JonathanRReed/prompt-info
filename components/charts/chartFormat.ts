export function formatUsd(value: number | null | undefined): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 'Unavailable';
  if (value === 0) return '$0.00';
  if (Math.abs(value) < 0.0001) return `$${value.toFixed(6)}`;
  if (Math.abs(value) < 1) return `$${value.toFixed(4)}`;
  return value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 });
}

export function formatCompactNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const absolute = Math.abs(value);
  if (absolute >= 1_000_000) return `${Number((value / 1_000_000).toPrecision(3))}M`;
  if (absolute >= 1_000) return `${Number((value / 1_000).toPrecision(3))}K`;
  return Math.round(value).toLocaleString('en-US');
}

export function scaleBars<T extends { id: string; value: number }>(rows: T[]) {
  const max = Math.max(0, ...rows.map(row => Number.isFinite(row.value) ? row.value : 0));
  return rows.map(row => ({
    ...row,
    widthPercent: max > 0 && row.value > 0 ? (row.value / max) * 100 : 0,
  }));
}

export function buildLinePoints(
  values: Array<{ x: number; y: number }>,
  width: number,
  height: number,
  padding: number,
  domain?: { minY: number; maxY: number },
) {
  if (values.length === 0) return [];
  const safeWidth = Math.max(padding * 2, width);
  const safeHeight = Math.max(padding * 2, height);
  const minY = domain?.minY ?? Math.min(...values.map(value => value.y));
  const maxY = domain?.maxY ?? Math.max(...values.map(value => value.y));
  const yRange = maxY - minY;

  return values.map((value, index) => ({
    x: values.length === 1
      ? padding
      : padding + (index / (values.length - 1)) * (safeWidth - padding * 2),
    y: yRange === 0
      ? domain ? safeHeight - padding : safeHeight / 2
      : safeHeight - padding - ((value.y - minY) / yRange) * (safeHeight - padding * 2),
    sourceX: value.x,
    sourceY: value.y,
  }));
}

export function segmentPercentages<T extends { key: string; value: number }>(segments: T[]) {
  const total = segments.reduce((sum, segment) => (
    sum + (Number.isFinite(segment.value) && segment.value > 0 ? segment.value : 0)
  ), 0);

  return segments.map(segment => ({
    ...segment,
    percent: total > 0 && segment.value > 0 ? (segment.value / total) * 100 : 0,
  }));
}
