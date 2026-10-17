import { describe, expect, test } from 'bun:test';
import { chooseSelection, reconcileSelection, type ModelSelection } from './modelSelection';

const catalog = (...names: string[]) => (name: string) => (names.includes(name) ? name : null);
const SIX = ['A', 'B', 'C', 'D', 'E', 'F'];
const DEFAULTS = ['W', 'X', 'Y', 'Z'];
const refresh = (current: ModelSelection, ...names: string[]) =>
  reconcileSelection(current, catalog(...names), DEFAULTS.filter((name) => names.includes(name)));
const start = (chosen: string[], active = chosen[0], ...names: string[]) =>
  reconcileSelection({ chosen, active }, catalog(...names), DEFAULTS.filter((name) => names.includes(name)));

describe('reconcileSelection', () => {
  test('removing the active model keeps the other selected survivor active', () => {
    expect(refresh(start(['A', 'B'], 'A', 'A', 'B', 'W'), 'B', 'W')).toEqual({ chosen: ['A', 'B'], selected: ['B'], active: 'B', missing: ['A'] });
  });

  test('all chosen gone shows stand-ins; all returning restores exactly the chosen six', () => {
    const gone = refresh(start(SIX, 'C', ...SIX, ...DEFAULTS), ...DEFAULTS);
    expect(gone).toEqual({ chosen: SIX, selected: DEFAULTS, active: 'W', missing: SIX });
    expect(refresh(gone, ...SIX, ...DEFAULTS)).toEqual({ chosen: SIX, selected: SIX, active: 'A', missing: [] });
  });

  test('a partial return replaces the stand-ins with the returning chosen models only', () => {
    const gone = refresh(start(['A', 'B', 'C'], 'B', 'A', 'B', 'C', ...DEFAULTS), ...DEFAULTS);
    expect(refresh(gone, 'C', ...DEFAULTS)).toEqual({ chosen: ['A', 'B', 'C'], selected: ['C'], active: 'C', missing: ['A', 'B'] });
  });

  test('repeated catalog churn never accumulates stand-ins', () => {
    let current = start(SIX, 'A', ...SIX, ...DEFAULTS);
    for (let i = 0; i < 4; i += 1) {
      current = refresh(current, ...DEFAULTS);
      expect(current.selected).toEqual(DEFAULTS);
      current = refresh(current, 'A', 'B', ...DEFAULTS);
      expect(current.selected).toEqual(['A', 'B']);
    }
    current = refresh(current, ...SIX, ...DEFAULTS);
    expect(current).toEqual({ chosen: SIX, selected: SIX, active: 'A', missing: [] });
  });

  test('a user edit during the fallback adopts the shown models; returns then fill only up to six', () => {
    const gone = refresh(start(SIX, 'A', ...SIX, ...DEFAULTS, 'V'), 'V', ...DEFAULTS);
    const edited = chooseSelection(gone, [...gone.selected, 'V'], 'X');
    expect(edited).toEqual({ chosen: [...DEFAULTS, 'V', ...SIX], selected: [...DEFAULTS, 'V'], active: 'X', missing: SIX });
    const back = refresh(edited, ...SIX, ...DEFAULTS, 'V');
    expect(back).toEqual({ chosen: [...DEFAULTS, 'V', 'A'], selected: [...DEFAULTS, 'V', 'A'], active: 'X', missing: [] });
  });

  test('pricing a stand-in makes it a choice that stays when chosen models return', () => {
    const gone = refresh(start(['A'], 'A', 'A', 'W', 'X'), 'W', 'X');
    const picked = chooseSelection(gone, gone.selected, 'X');
    expect(refresh(picked, 'A', 'W', 'X')).toEqual({ chosen: ['W', 'X', 'A'], selected: ['W', 'X', 'A'], active: 'X', missing: [] });
  });

  test('at capacity a returning model is dropped, not reported absent', () => {
    const atCap = chooseSelection(refresh(start(['G', 'A'], 'A', 'G', 'A'), 'A'), ['A', 'B', 'C', 'D', 'E', 'F'], 'A');
    expect(atCap.missing).toEqual(['G']);
    expect(refresh(atCap, 'G', ...SIX)).toEqual({ chosen: SIX, selected: SIX, active: 'A', missing: [] });
  });

  test('a link with more than six models shows the first six and labels none of the rest absent', () => {
    const link = start([...SIX, 'G', 'H'], undefined, ...SIX, 'G', 'H');
    expect(link).toEqual({ chosen: SIX, selected: SIX, active: 'A', missing: [] });
  });

  test('an empty catalog selects nothing and keeps every choice as missing', () => {
    const empty = refresh(start(['A', 'B'], 'B', 'A', 'B'));
    expect(empty).toEqual({ chosen: ['A', 'B'], selected: [], active: '', missing: ['A', 'B'] });
    expect(refresh(empty, 'A', 'B')).toEqual({ chosen: ['A', 'B'], selected: ['A', 'B'], active: 'A', missing: [] });
  });

  test('link names resolve to catalog names and stay as written while missing', () => {
    const resolve = (name: string) => (name === 'test/flat' || name === 'Lab: Flat' ? 'Lab: Flat' : null);
    expect(reconcileSelection({ chosen: ['test/gone', 'test/flat'], active: '' }, resolve, [])).toEqual({ chosen: ['test/gone', 'Lab: Flat'], selected: ['Lab: Flat'], active: 'Lab: Flat', missing: ['test/gone'] });
  });
});

describe('chooseSelection', () => {
  test('caps the shown models at six and keeps the priced model among them', () => {
    const current = start(['A'], 'A', 'A');
    expect(chooseSelection(current, ['G', ...SIX], 'F')).toEqual({ chosen: ['G', 'A', 'B', 'C', 'D', 'E'], selected: ['G', 'A', 'B', 'C', 'D', 'E'], active: 'G', missing: [] });
  });
});
