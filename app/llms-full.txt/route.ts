import { buildPricingCatalogResponse } from '../../lib/pricingCatalog';

export const revalidate = 900;
export const dynamic = 'force-static';

const SITE = 'https://prompt-info.helloworldfirm.com';

const perMillion = (perThousand: number): string => `$${(perThousand * 1_000).toFixed(perThousand * 1_000 < 0.01 ? 4 : 2)}`;
const tokens = (value: number | undefined): string => (value ? value.toLocaleString('en-US') : 'n/a');

/**
 * Long-form companion to /llms.txt: every priced model in the catalog the
 * calculator uses, plus the arithmetic, so an assistant can reproduce an
 * estimate and cite the page instead of guessing.
 */
export async function GET() {
  const catalog = await buildPricingCatalogResponse({
    supabaseUrl: process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    openrouterBaseUrl: process.env.OPENROUTER_API_BASE_URL,
  });
  const names = Object.keys(catalog.data).sort((a, b) => a.localeCompare(b));

  const head = [
    '# Prompt Info, full pricing listing',
    '',
    `> Every model the cost calculator can price, with input and output price per one million tokens, context window, and output limit where the source lists one. Source: ${catalog.source}, retrieved ${catalog.retrievedAt}. Generated at build from the same catalog the calculator loads.`,
    '',
    'How the calculator computes an estimate (all prices are US dollars per one million tokens):',
    '- One uncached request = (input tokens x input price + generated tokens x output price) / 1,000,000.',
    '- Each request charges its own input and output. Retained history grows until the configured paid summary replaces it. Thinking is included in generated output.',
    '- Independent agent streams and full-task reruns multiply the specified workload. Optional monthly volume repeats complete tasks.',
    '- Low, central and high workload scenarios vary response count and token sizes. These are editable assumptions, not measured averages or guaranteed bounds.',
    '- Published cache and conditional long-context rates are applied per request. Provider-specific billing, service tiers, hosted tools and tokenizer differences can change the final invoice.',
    '',
    `Calculator: ${SITE}/`,
    `Short guide: ${SITE}/llms.txt`,
    `Pricing catalog JSON: ${SITE}/api/pricing`,
    `Benchmark catalog JSON: ${SITE}/api/benchmarks`,
    `Format comparison: ${SITE}/format-comparison/`,
    `Output tradeoffs: ${SITE}/token-efficiency/`,
    'A link of the form /?models=<id,id>&tokens=<n>&out=<n>&turns=<n>&mode=baseline|scenario&runs=<n>&cadence=once|day|week|month opens the calculator with those assumptions and no prompt text.',
    '',
    'Usage policy: search indexing and AI answers with a link back are allowed. Google-Extended may use the site for Gemini grounding and training; other AI training is not allowed. See /robots.txt.',
    '',
    `## Models (${names.length})`,
    '',
  ];

  const body = names.map(name => {
    const entry = catalog.data[name];
    const lines = [
      `### ${name}`,
      `- Input: ${perMillion(entry.pricing.input)} per 1M tokens`,
      `- Output: ${perMillion(entry.pricing.output)} per 1M tokens`,
    ];
    if (entry.pricing.inputCacheRead !== undefined) lines.push(`- Cached input read: ${perMillion(entry.pricing.inputCacheRead)} per 1M tokens`);
    if (entry.contextWindowTokens) lines.push(`- Context window: ${tokens(entry.contextWindowTokens)} tokens`);
    if (entry.maxOutputTokens) lines.push(`- Max output: ${tokens(entry.maxOutputTokens)} tokens${entry.outputTokenLimitSource ? ` (${entry.outputTokenLimitSource})` : ''}`);
    if (entry.openRouterId) lines.push(`- OpenRouter id: ${entry.openRouterId}`);
    lines.push(`- Open in the calculator: ${SITE}/?models=${encodeURIComponent(entry.openRouterId ?? name)}`);
    return `${lines.join('\n')}\n`;
  });

  return new Response(`${head.join('\n')}${body.join('\n')}`, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=300, s-maxage=86400, stale-while-revalidate=604800',
    },
  });
}
