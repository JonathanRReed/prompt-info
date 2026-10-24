import { expect, test } from 'bun:test';
import { spawnSync } from 'node:child_process';

test('installed local preview HTTP client retains integrity checks without external requests', () => {
  // Bun substitutes its built-in undici, so check the installed package in Node.
  const script = `
    const assert = require('node:assert/strict');
    const { createRequire } = require('node:module');
    const { createHash } = require('node:crypto');
    const { MockAgent, fetch } = createRequire(require.resolve('miniflare'))('undici');
    (async () => {
      const dispatcher = new MockAgent();
      dispatcher.disableNetConnect();
      const body = 'local fixture';
      const integrity = 'sha256-' + createHash('sha256').update(body).digest('base64');
      try {
        const pool = dispatcher.get('https://example.test');
        pool.intercept({ path: '/valid' }).reply(200, body);
        assert.equal(await (await fetch('https://example.test/valid', { dispatcher, integrity })).text(), body);
        pool.intercept({ path: '/mismatch' }).reply(200, 'different fixture');
        await assert.rejects(fetch('https://example.test/mismatch', { dispatcher, integrity }));
      } finally {
        await dispatcher.close();
      }
      console.log('Installed HTTP client integrity checks passed');
    })().catch(error => { console.error(error); process.exitCode = 1; });
  `;
  const result = spawnSync('node', ['-e', script], { encoding: 'utf8', timeout: 10_000 });
  expect(result.status, result.stderr || result.error?.message).toBe(0);
  expect(result.stdout).toContain('Installed HTTP client integrity checks passed');
});
