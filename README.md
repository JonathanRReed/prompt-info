# Prompt Info

**AI Workload Cost Workbench**

A product of [Hello.World Consulting](https://helloworldfirm.com).
Made by Jonathan R. Reed.

---

## Overview

Prompt Info is a browser-based AI workload cost workbench. Paste a real prompt, compare current models, price a request or multi-turn session, project recurring spend, inspect the assumptions, and export a planning receipt.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Bun 1.4.

## Features

- **Token counting**: BPE tokenization with `o200k_base`, `cl100k_base`, `p50k_base`, `p50k_edit`, and `r50k_base`, plus per-provider calibration for vendors that bill with their own tokenizers.
- **Cost calculator**: Live pricing from OpenRouter with a database/static fallback, input/output cost breakdowns, and per-million rate display.
- **Agent sessions**: Baseline (stateless) and scenario modes. Scenario re-sends conversation history each turn, prices cache reads and writes per provider, and simulates compaction summarization calls.
- **Recurring AI workloads**: Scale one priced request or agent session by runs per day, week, month, or one-time batch. Monthly and annual projections include model usage only.
- **Prompt format lab**: The same payload as TOON, JSON, compact JSON, YAML, XML, and CSV, with selectable tokenizers, raw wrapper overhead, and planner-model input cost.
- **Token efficiency**: An attributed Artificial Analysis catalog plus editable per-task comparisons showing how a cheaper per-token model that emits more tokens can cost more overall.
- **Shared scenario**: The active prompt, tokenizer, model, token plan, and workload move between the planner, format lab, and efficiency lab in memory without storing pasted text.
- **Private prompt boundary**: Pasted prompt text stays in browser memory. The browser contacts only same-origin catalog routes, never OpenRouter, Artificial Analysis, or Supabase directly.
- **Receipt export**: Download an image receipt of the estimate.

## Requirements

- Bun 1.4
- Node.js 22.12 or newer

## Getting Started

1. **Install dependencies:**

   ```bash
   bun install --frozen-lockfile
   ```

2. **Run locally:**

   ```bash
   bun run dev
   ```

3. **Build for production:**

   ```bash
   bun run build
   bun run preview:cloudflare
   ```

`preview:cloudflare` serves the `out/` static export together with the Pages Functions in `functions/api/`.

## Data Sources

- `OPENROUTER_API_BASE_URL` can override the default OpenRouter model-pricing endpoint.
- `ARTIFICIAL_ANALYSIS_API_KEY` enables the server-side Artificial Analysis free API catalog. The key is never sent to the browser.
- `SUPABASE_URL` and `SUPABASE_ANON_KEY`, or their existing `NEXT_PUBLIC_` equivalents, provide the project's `aa_models` cache when the direct Artificial Analysis API is not configured.
- A dated three-model benchmark snapshot keeps the educational comparison usable when neither live source is available. The interface identifies the active source and does not invent missing cost-per-task fields.
- Pricing and benchmark routes validate upstream payloads, enforce request timeouts, and return source, freshness, and fallback metadata with every usable catalog.

## Quality Checks

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun audit
```

Regenerate the 1200×630 social preview card with `bun run assets:social`.

## Cloudflare Pages

- Build command: `bun install --frozen-lockfile && bun run build`
- Build output directory: `out`
- Production hostname: `prompt-info.helloworldfirm.com`

---

For more info, visit [helloworldfirm.com](https://helloworldfirm.com)

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License.
This repository is source-available today and converts to MIT two years after
each version is made available. See [`LICENSE`](./LICENSE).
