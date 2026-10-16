# Workload estimates

The calculator estimates API model usage, not subscription prices or the cost of successfully solving an arbitrary problem. A task preset supplies editable assumptions. It is not a measured average, a confidence interval or a provider guarantee.

## Three paths

- Choose a model and task preset for a first estimate. Quick questions and large agent projects use different response counts, context growth and thinking allowances.
- Import or enter individual API usage records to reprice an existing workload. Another model can need different tokens and still produce a different result.
- Use Output tradeoffs and Format comparison to explore how token volume, rates and model-visible formatting affect cost.

## Accounting

Every request charges its input and generated output. Input includes system instructions, supplied material and any retained history. Output is split into visible content, thinking and separately generated context summaries. The total includes all of them once.

With caching enabled, an eligible repeated prefix receives the assumed hit rate. Cache reads use published per-model rates; misses use a published cache-write rate where applicable. Gemini implicit cache misses use ordinary input pricing. Minimum cache sizes are provider-specific. Unknown cache rates do not receive invented discounts. The hit percentage approximates workload behavior; it does not guarantee a live hit or model cache expiration.

Long-context price thresholds apply to each request, not the sum of a whole run. Context fit checks reserve both input and output space.

Long-running presets periodically replace accumulated history with a summary. The summary is modeled as a separate uncached request to the same model, including its input and all generated summary tokens. Subsequent requests begin with shared instructions, the summary and new context. This is an editable strategy, not an assertion that every provider's native compaction uses this billing method.

Independent streams each perform the specified workload. Full-task reruns repeat it from a cold start. Monthly volume is optional and repeats the complete task; it does not extend one agent's activity. Wall-clock time and tool-call count are not flat model fees.

The engine calculates repeated context blocks algebraically and keeps only a bounded sample ledger for large workloads. Tests compare these totals with a separate per-request implementation. It never truncates a long workload to fit a display limit.

## Evidence and limits

Reviewed October 16, 2026:

- [Anthropic thinking and cost](https://platform.claude.com/docs/en/build-with-claude/thinking-steering-and-cost): effort is a soft control, not a guaranteed number of tokens.
- [OpenRouter prompt caching](https://openrouter.ai/docs/guides/best-practices/prompt-caching): provider-specific cache behavior and rates. Live catalog rates take precedence over generic multipliers.
- [Google context caching](https://ai.google.dev/gemini-api/docs/caching): implicit caching for Gemini 2.5 and newer, with model-specific minimums.
- [Anthropic's compiler experiment](https://www.anthropic.com/engineering/building-c-compiler): roughly $20,000 across nearly 2,000 sessions with a 16-agent team. This is a historical project total, not a universal cost-per-agent or hourly rate.
- [Anthropic compaction](https://platform.claude.com/docs/en/build-with-claude/compaction-on-demand): compaction is real work that needs to be accounted for.

The presets are independent hypothetical scenarios, not reproductions of that compiler experiment. A large bill does not establish quality. Tokenizer estimates, cache behavior, changing rates, task complexity and stopping conditions all introduce uncertainty. Hosted tools, infrastructure, explicit Gemini cache storage, batch/service-tier discounts, taxes and platform fees require separate accounting.

## Gemini usage imports

For generateContent, input is `promptTokenCount + toolUsePromptTokenCount`;
output is `candidatesTokenCount + thoughtsTokenCount`. Cached content is already
inside the original prompt count. If supplied, `totalTokenCount` must reconcile
with those four categories. See Google's [UsageMetadata reference](https://ai.google.dev/api/generate-content#UsageMetadata).

Gemini Interactions has a different schema. Recognizable Interactions records
are rejected with an explanation rather than treated as OpenAI records, which
would drop tool input and thinking. Use generateContent usage or explicitly
normalized totals instead. Google's [URL context example](https://ai.google.dev/gemini-api/docs/url-context#token-count)
illustrates the separate tool-input and thinking fields.
