# Prompt Info Product Specification

## Product role

Prompt Info is the free AI workload cost workbench in Jonathan Reed's AI product ecosystem.

- AI News explains what changed.
- AI Stats shows how models compare.
- Prompt Info answers what a specific prompt, agent session, or recurring workload will cost.

The product must turn an abstract price-per-million number into a decision a person can act on. It does not sell access, require an account, or put core results behind a paywall.

## Core promise

Paste a prompt or describe a workload. Prompt Info will show:

1. how many tokens the request uses,
2. what one request, one session, one month, and one year cost,
3. how two or three credible models compare,
4. which assumptions materially change the estimate, and
5. where every price or benchmark came from and when it was refreshed.

The result must be understandable in the first viewport on a laptop and usable without reading an explainer first.

## Primary users

- Individual builders choosing a model for a new feature.
- Teams estimating the operating cost of an AI workflow.
- Researchers comparing tokenizers, formats, and output efficiency.
- Curious users who want an honest, no-account answer to "what will this cost?"

## Product principles

### Scenario first

Every estimate belongs to one in-memory scenario: prompt, tokenizer, model set, output plan, session behavior, and recurrence. The planner, format lab, and token-efficiency lab operate on the same scenario instead of presenting disconnected calculators.

### Exact before impressive

Prominent totals must always disclose the model, token counts, rates, cache assumptions, run frequency, source, and freshness. Prompt Info must not present an opaque "best model" score.

### Credible defaults

The initial comparison should feature current, broadly useful model families with usable pricing data. Raw provider order, missing-price rows, obscure aliases, and unmeasured models must not dominate the experience.

### Free and private

Core workflows remain free. Pasted prompt text stays in the browser and is never sent to Prompt Info, OpenRouter, Artificial Analysis, Supabase, analytics, or another service. Only server-side catalog requests may contact upstream data providers.

### Honest freshness

Live, cached, and static fallback data must look different. A stale or fallback catalog may keep the product usable, but it must never masquerade as current live data.

### Useful density

The interface should be compact, technical, and readable. It should privilege inputs, comparisons, receipts, and evidence over marketing copy or decorative sections.

## Primary experience

### 1. Define the workload

The first viewport contains the workbench. Users can paste a prompt, use a representative sample, or enter token counts directly. They can then set expected output, turns, cache behavior, and recurrence.

### 2. Compare models

Users can compare two or three models. Each model row shows:

- provider and model name,
- input and output rates,
- one-request total,
- session total,
- monthly and annual totals,
- source and freshness,
- missing or estimated fields.

The default set should be credible and diverse, not simply the cheapest or newest records.

### 3. Understand the cost

Three compact visualizations explain the estimate:

- **Cost by model:** sorted bars with visible exact values.
- **Token composition:** input, output, cache-read, cache-write, and compaction shares.
- **Session accumulation:** cumulative cost by turn, including conversation replay and compaction when enabled.

Every visualization requires a text or table equivalent. Color cannot be the only carrier of meaning.

### 4. Inspect the receipt

The receipt is the durable explanation of the result. It records the scenario, model rates, totals, assumptions, source names, freshness, and warnings. Users can copy or export it without creating an account.

### 5. Explore the labs

The format-comparison and token-efficiency labs support the active scenario. They are secondary tools, not competing homepages.

## Information architecture

- `/`: unified cost workbench, comparison, charts, receipt, and compact methodology.
- `/format-comparison`: compare equivalent representations using the active scenario.
- `/token-efficiency`: compare model cost per completed task with attributed benchmark evidence.
- `/about`: concise methodology, privacy, sources, and limitations.
- `/api/pricing`: same-origin catalog endpoint with validation, timeout, caching, provenance, and fallback metadata.
- `/api/benchmarks`: same-origin benchmark endpoint with the same reliability contract.

Existing public routes and search metadata remain valid.

## Data contract

Every catalog response must include:

- a schema version,
- source name,
- source URL or attribution identifier,
- retrieved or generated timestamp,
- freshness state,
- fallback state and reason when applicable,
- validated records only.

Runtime adapters may differ between Next.js static export and Cloudflare Pages Functions, but normalization and fallback rules must live in shared server-safe modules.

Upstream fetches require explicit timeouts. Invalid payloads, non-OK responses, and missing credentials must resolve to a labeled cache or static fallback. Browser code must never call OpenRouter or Artificial Analysis directly.

## Recommendation rules

Prompt Info may recommend a model only against a stated criterion such as lowest monthly cost, lowest cost among selected models, largest context window, or best sourced task-economics result. Recommendations must:

- exclude rows without the required evidence,
- state the criterion in plain language,
- show the underlying values,
- avoid combining unrelated benchmark dimensions into an opaque score,
- remain scoped to the user's scenario.

## Quality bar

The launch is acceptable only when:

- the calculator and credible default models appear in the first desktop viewport,
- a useful result is available without registration or payment,
- no pasted prompt leaves the browser,
- there is no direct browser fallback to upstream providers,
- live, cached, and fallback states are visibly distinct,
- the three core charts have exact-value fallbacks,
- keyboard, reduced-motion, 375 px, 768 px, 1024 px, and 1440 px layouts work,
- loading, empty, partial-data, upstream-error, and success states are tested,
- lint, typecheck, unit tests, production build, browser tests, dependency audit, and a post-change security review pass,
- the deployed production SHA matches the pushed repository SHA.

## Non-goals

- A general AI leaderboard that duplicates AI Stats.
- A news feed that duplicates AI News.
- Accounts, billing, subscriptions, or paid tiers.
- Claims about model quality without attributable evidence.
- Persisting prompts, receipts, or private workload data on a server.
- Decorative motion that slows the calculator or hides information.
