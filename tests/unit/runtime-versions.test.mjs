import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../../${path}`, import.meta.url), 'utf8');
const manifest = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/verify.yml');

test('Bun runtime and CI use the same reviewed patch', () => {
  expect(manifest.packageManager).toBe('bun@1.4.4');
  expect(workflow).toContain("bun-version: '1.4.4'");
});

test('development and CI cover the pinned LTS runtime explicitly', () => {
  const node = read('.nvmrc').trim();
  expect(node).toBe('24.22.1');
  expect(workflow).toContain("node: ['22.23.4', '24.22.1']");
  expect(workflow).toContain('node-version: ${{ matrix.node }}');
  expect(workflow).toContain('actions/setup-node@');
});

test('React renderer versions and type families remain paired', () => {
  expect(manifest.dependencies.react).toBe('19.3.1');
  expect(manifest.dependencies['react-dom']).toBe(manifest.dependencies.react);
  expect(manifest.devDependencies['@types/react']).toBe('19.3.0');
  expect(manifest.devDependencies['@types/react-dom']).toBe('19.3.0');
  expect(manifest.dependencies.next).toBe('16.4.3');
});

test('the frozen lock workspace matches the manifest identity and direct dependencies', () => {
  const workspace = Bun.JSONC.parse(read('bun.lock')).workspaces[''];
  expect(workspace.name).toBe(manifest.name);
  expect(workspace.dependencies).toEqual(manifest.dependencies);
  expect(workspace.devDependencies).toEqual(manifest.devDependencies);
});
