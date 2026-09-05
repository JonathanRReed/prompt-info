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
    '- One request = prompt tokens x input price + output tokens x output price.',
    '- A session multiplies turns. In baseline mode every turn resends the growing context; in scenario mode the planned turn sizes are used as entered.',
    '- A workload multiplies the session cost by runs per cadence (once, day, week, month) and reports monthly and annual totals.',
    '- Planning ranges add a volume variance percentage and a retry allowance on top of the point estimate.',
    '- These are planning values. A provider invoice will not match them line for line: cached input, batch discounts, and tokenizer differences all move the real number.',
    '',
    `Calculator: ${SITE}/`,
    `Short guide: ${SITE}/llms.txt`,
    `Pricing catalog JSON: ${SITE}/api/pricing`,
    `Benchmark catalog JSON: ${SITE}/api/benchmarks`,
    `Format comparison: ${SITE}/format-comparison/`,
    `Cost per task: ${SITE}/token-efficiency/`,
    'A link of the form /?models=<id,id>&tokens=<n>&out=<n>&turns=<n>&mode=baseline|scenario&runs=<n>&cadence=once|day|week|month opens the calculator with those assumptions and no prompt text.',
    '',
    'Usage policy: search indexing allowed, AI answers with a link back allowed, AI training not allowed. Matches the content signals in /robots.txt.',
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
