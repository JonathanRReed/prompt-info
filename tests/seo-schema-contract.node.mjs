import assert from 'node:assert/strict';

const siteUrl = 'https://prompt-info.helloworldfirm.com';
const authorId = 'https://jonathanrreed.com/#person';
const publisherId = 'https://helloworldfirm.com/#organization';

// Google requires a real rating or review for software-app rich results,
// including WebApplication. These pages currently have neither.
const softwareTypes = new Set(['SoftwareApplication', 'WebApplication', 'MobileApplication']);

function walk(value, visit) {
  if (!value || typeof value !== 'object') return;
  visit(value);
  for (const child of Object.values(value)) walk(child, visit);
}

export function assertPageSchema(documents, route, expectedType) {
  const nodes = documents.flatMap(document => document['@graph'] ?? [document]);
  assert.ok(documents.every(document => document['@context'] === 'https://schema.org'));

  walk(documents, node => {
    const types = Array.isArray(node['@type']) ? node['@type'] : [node['@type']];
    assert.ok(types.every(type => !softwareTypes.has(type)), 'No unsupported software-app rich-result markup');
    assert.ok(!('aggregateRating' in node), 'No fabricated aggregate ratings');
    assert.ok(!('review' in node), 'No fabricated reviews');
    assert.notEqual(node['@id'], `${siteUrl}/#app`, 'No obsolete calculator entity or reference');
  });

  const websites = nodes.filter(node => node['@type'] === 'WebSite');
  assert.equal(websites.length, 1);
  assert.equal(websites[0]['@id'], `${siteUrl}/#website`);
  assert.equal(websites[0].name, 'Prompt Info');
  assert.equal(websites[0].url, `${siteUrl}/`);
  assert.equal(websites[0].author['@id'], authorId);
  assert.equal(websites[0].publisher['@id'], publisherId);

  assert.ok(nodes.some(node => node['@type'] === 'Person' && node['@id'] === authorId && node.name === 'Jonathan R. Reed'));
  assert.ok(nodes.some(node => node['@type'] === 'Organization' && node['@id'] === publisherId && node.name === 'Hello.World Consulting'));

  const url = `${siteUrl}/${route}`;
  const pages = nodes.filter(node => ['WebPage', 'AboutPage', 'ContactPage'].includes(node['@type']));
  assert.equal(pages.length, 1, 'Exactly one page entity');
  assert.equal(pages[0]['@type'], expectedType);
  assert.equal(pages[0].url, url);
  assert.equal(pages[0]['@id'], `${url}#webpage`);
  assert.equal(pages[0].isPartOf['@id'], websites[0]['@id']);
  assert.equal(pages[0].author['@id'], authorId);
  assert.equal(pages[0].publisher.name, 'Hello.World Consulting');
}
