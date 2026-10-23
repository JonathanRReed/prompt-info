import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const lock = Bun.JSONC.parse(readFileSync(new URL('../bun.lock', import.meta.url), 'utf8')) as {
  packages: Record<string, [string, ...unknown[]]>;
};

// Retained from PR 5 and adapted to the dependency graph after PR 15.
// Floors protect reviewed packages; the independent unfiltered audit is still
// required to catch other advisories. Removed packages are not reintroduced.
const floors: Record<string, string> = {
  next: '16.4.1',
  sharp: '0.35.5',
  'source-map-js': '1.2.2',
  undici: '7.29.1',
};

describe('reviewed dependency security updates', () => {
  test('all installed lockfile copies meet their reviewed patched floor', () => {
    const found = new Set<string>();
    for (const [specifier] of Object.values(lock.packages)) {
      const separator = specifier.lastIndexOf('@');
      const name = specifier.slice(0, separator);
      const version = specifier.slice(separator + 1);
      const floor = name === 'brace-expansion'
        ? (version.startsWith('1.') ? '1.1.21' : '5.0.12')
        : floors[name];
      if (!floor) continue;
      found.add(name);
      expect(Bun.semver.satisfies(version, `>=${floor}`), specifier).toBe(true);
    }
    for (const name of [...Object.keys(floors), 'brace-expansion']) {
      expect(found.has(name), name).toBe(true);
    }
  });

  test('HTTP headers preserve ordinary values and reject line injection', () => {
    const { Headers } = require('undici');
    const headers = new Headers({ 'Content-Type': 'application/json' });
    expect(headers.get('content-type')).toBe('application/json');
    expect(() => headers.set('x-test', 'value\r\nx-other: injected')).toThrow();
  });

  test('image processing still produces a decodable PNG', async () => {
    const sharp = require('sharp');
    const png = await sharp({ create: { width: 2, height: 3, channels: 4, background: '#336699' } }).png().toBuffer();
    const metadata = await sharp(png).metadata();
    expect(metadata.format).toBe('png');
    expect(metadata.width).toBe(2);
    expect(metadata.height).toBe(3);
  });

  test('source maps preserve original positions', () => {
    const { SourceMapGenerator, SourceMapConsumer } = require('source-map-js');
    const map = new SourceMapGenerator({ file: 'built.js' });
    map.addMapping({ generated: { line: 1, column: 0 }, original: { line: 3, column: 2 }, source: 'source.ts' });
    expect(new SourceMapConsumer(map.toJSON()).originalPositionFor({ line: 1, column: 0 }))
      .toMatchObject({ source: 'source.ts', line: 3, column: 2 });
  });

  test('indexed source maps reject amplified line offsets', () => {
    const { SourceMapConsumer } = require('source-map-js');
    expect(() => new SourceMapConsumer({ version: 3, sections: [{
      offset: { line: 10000001, column: 0 },
      map: { version: 3, sources: ['source.ts'], names: [], mappings: 'AAAA' },
    }] })).toThrow('Section offset line must not exceed');
  });

  test('brace expansion preserves ordinary project globs', () => {
    expect(require('brace-expansion')('src/{app,lib}/*.ts')).toEqual(['src/app/*.ts', 'src/lib/*.ts']);
  });
});
