import { describe, expect, test } from 'bun:test';
import { reconcileSelection, type ModelSelection } from './modelSelection';

const catalog = (...names: string[]) => (name: string) => (names.includes(name) ? name : null);
const state = (selected: string[], active: string, missing: string[] = []): ModelSelection => ({ selected, active, missing });

describe('reconcileSelection', () => {
  test('removing the active model keeps the other selected survivor active', () => {
    expect(reconcileSelection(state(['A', 'B'], 'A'), catalog('B', 'D'), ['D'])).toEqual(state(['B'], 'B', ['A']));
  });

  test('removing every selected model falls back to defaults and reports all as missing', () => {
    expect(reconcileSelection(state(['A', 'B'], 'B'), catalog('D', 'E'), ['D', 'E'])).toEqual(state(['D', 'E'], 'D', ['A', 'B']));
  });

  test('a missing model that reappears returns and leaves the notice', () => {
    const gone = reconcileSelection(state(['A', 'B'], 'B'), catalog('B'), ['B']);
    expect(reconcileSelection(gone, catalog('A', 'B'), ['B'])).toEqual(state(['B', 'A'], 'B', []));
  });

  test('repeated refreshes with the same catalog are stable', () => {
    let current = state(['A', 'C'], 'C', ['X']);
    for (let i = 0; i < 3; i += 1) current = reconcileSelection(current, catalog('A', 'C'), ['A']);
    expect(current).toEqual(state(['A', 'C'], 'C', ['X']));
  });

  test("the user's own changes between refreshes are kept, not the original link models", () => {
    const afterImport = state(['A', 'B'], 'A');
    const userEdited = state(['C'], 'C');
    expect(reconcileSelection(userEdited, catalog('A', 'B', 'C'), ['A'])).toEqual(state(['C'], 'C', []));
    expect(reconcileSelection(afterImport, catalog('A', 'B', 'C'), ['C'])).toEqual(afterImport);
  });

  test('an empty catalog selects nothing and keeps every choice as missing', () => {
    const empty = reconcileSelection(state(['A', 'B'], 'A'), catalog(), []);
    expect(empty).toEqual(state([], '', ['A', 'B']));
    expect(reconcileSelection(empty, catalog('A', 'B'), ['A'])).toEqual(state(['A', 'B'], 'A', []));
  });

  test('link names resolve to catalog names and stay as written while missing', () => {
    const resolve = (name: string) => (name === 'test/flat' || name === 'Lab: Flat' ? 'Lab: Flat' : null);
    expect(reconcileSelection(state([], '', ['test/flat', 'test/gone']), resolve, [])).toEqual(state(['Lab: Flat'], 'Lab: Flat', ['test/gone']));
  });
});
