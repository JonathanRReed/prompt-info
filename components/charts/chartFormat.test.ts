import { describe, expect, test } from 'bun:test';
import {
  buildLinePoints,
  formatCompactNumber,
  formatUsd,
  scaleBars,
  segmentPercentages,
} from './chartFormat';

describe('chart formatting', () => {
  test('formats zero, tiny, regular, and large dollar values without hiding precision', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(0.0000012)).toBe('$0.000001');
    expect(formatUsd(0.12345)).toBe('$0.1235');
    expect(formatUsd(12_345.67)).toBe('$12,345.67');
    expect(formatUsd(null)).toBe('Unavailable');
  });

  test('formats readable token counts', () => {
    expect(formatCompactNumber(950)).toBe('950');
    expect(formatCompactNumber(1_250)).toBe('1.25K');
    expect(formatCompactNumber(2_500_000)).toBe('2.5M');
  });
});

describe('chart geometry', () => {
  test('scales bars against the largest usable value and preserves ties', () => {
    expect(scaleBars([
      { id: 'zero', value: 0 },
      { id: 'small', value: 2 },
      { id: 'large-a', value: 10 },
      { id: 'large-b', value: 10 },
    ])).toEqual([
      { id: 'zero', value: 0, widthPercent: 0 },
      { id: 'small', value: 2, widthPercent: 20 },
      { id: 'large-a', value: 10, widthPercent: 100 },
      { id: 'large-b', value: 10, widthPercent: 100 },
    ]);
  });

  test('builds finite line coordinates for one point and a flat series', () => {
    expect(buildLinePoints([{ x: 1, y: 4 }], 100, 40, 4)).toEqual([{ x: 4, y: 20 }]);
    expect(buildLinePoints([{ x: 1, y: 4 }, { x: 2, y: 4 }], 100, 40, 4)).toEqual([
      { x: 4, y: 20 },
      { x: 96, y: 20 },
    ]);
  });

  test('turns positive segments into percentages and keeps empty segments at zero', () => {
    expect(segmentPercentages([
      { key: 'input', value: 3 },
      { key: 'output', value: 1 },
      { key: 'empty', value: 0 },
    ])).toEqual([
      { key: 'input', value: 3, percent: 75 },
      { key: 'output', value: 1, percent: 25 },
      { key: 'empty', value: 0, percent: 0 },
    ]);
  });
});
