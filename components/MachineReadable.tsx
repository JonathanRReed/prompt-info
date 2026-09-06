'use client';

import { CodeBlock } from '@/components/ui/code-block';

const REQUEST = `# The priced catalog the calculator loads, same origin, no key.
curl -s https://prompt-info.helloworldfirm.com/api/pricing

# Every priced model as plain text, with the arithmetic spelled out.
curl -s https://prompt-info.helloworldfirm.com/llms-full.txt`;

const RESPONSE = `{
  "schemaVersion": 1,
  "source": "openrouter-live",
  "freshness": "live",
  "retrievedAt": "2026-09-06T20:22:24.113Z",
  "data": {
    "OpenAI: GPT-6 Astra": {
      "pricing": {
        "input": 0.01,
        "output": 0.05,
        "inputCacheRead": 0.001,
        "inputCacheWrite": 0.0125
      },
      "contextWindowTokens": 1050000,
      "maxOutputTokens": 128000,
      "outputTokenLimitSource": "OpenRouter model data",
      "openRouterId": "openai/gpt-6-astra"
    }
  }
}`;

/**
 * The site publishes machine-readable pricing but never showed its shape.
 * Prices in the payload are per 1,000 tokens; the interface multiplies by
 * 1,000 before display, which is worth seeing before anyone parses it.
 */
export default function MachineReadable() {
  return (
    <div className="grid gap-4">
      <CodeBlock code={REQUEST} language="bash" filename="Fetch the catalog" showLineNumbers={false} />
      <CodeBlock code={RESPONSE} language="json" filename="api/pricing response" />
      <p className="text-xs leading-relaxed text-rose-subtle">
        Prices in the payload are US dollars per 1,000 tokens. The calculator multiplies by 1,000 before it
        shows a rate, so a displayed rate per million is a thousand times the value in this field.
      </p>
    </div>
  );
}
