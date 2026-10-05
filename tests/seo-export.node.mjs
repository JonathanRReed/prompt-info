import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { assertPageSchema } from './seo-schema-contract.node.mjs';

const pages = [
  ['', 'AI Workload Cost Calculator | Prompt Info'],
  ['about/', 'About | Prompt Info'],
  ['contact/', 'Contact | Prompt Info'],
  ['privacy/', 'Privacy Policy | Prompt Info'],
  ['format-comparison/', 'Prompt Format Comparison Tool | Prompt Info'],
  ['token-efficiency/', 'LLM Token Efficiency Comparison | Prompt Info'],
];

// Check Next's rendered export, rather than reimplementing its title-template
// rules. The root page and child segments resolve titles differently.
for (const [route, expectedTitle] of pages) {
  test(`/${route} exports one descriptive title and its own canonical`, () => {
    const html = readFileSync(new URL(`../out/${route}index.html`, import.meta.url), 'utf8');
    const titles = [...html.matchAll(/<title>([^<]*)<\/title>/g)];
    assert.equal(titles.length, 1);
    assert.equal(titles[0][1], expectedTitle);
    assert.equal((titles[0][1].match(/Prompt Info/g) ?? []).length, 1);
    assert.ok(html.includes(`<link rel="canonical" href="https://prompt-info.helloworldfirm.com/${route}"`));
  });
}

for (const [route] of pages) {
  test(`/${route} exports truthful site and page structured data without software-app ratings`, () => {
    const html = readFileSync(new URL(`../out/${route}index.html`, import.meta.url), 'utf8');
    const documents = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)]
      .map(match => JSON.parse(match[1]));
    const expectedType = route === 'about/' ? 'AboutPage' : route === 'contact/' ? 'ContactPage' : 'WebPage';
    assertPageSchema(documents, route, expectedType);
  });
}
