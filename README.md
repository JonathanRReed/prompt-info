# Prompt Info

**LLM Token Counter and Cost Calculator**

A product of [Hello.World Consulting](https://helloworldfirm.com).
Made by Jonathan R. Reed.

---

## Overview

Prompt Info is a browser-based LLM token counter and cost calculator. Paste draft text, choose a model, compare OpenAI tokenizer families, inspect the assumptions, and export a planning receipt for multi-turn agent sessions.

Built with Next.js 16, React 19, TypeScript, Tailwind CSS 4, and Bun 1.4.

## Features

- **Token counting**: BPE tokenization with `o200k_base`, `cl100k_base`, `p50k_base`, `p50k_edit`, and `r50k_base`, plus per-provider calibration for vendors that bill with their own tokenizers.
- **Cost calculator**: Live pricing from OpenRouter with a static catalog fallback, input/output cost breakdowns, and per-million rate display.
- **Agent sessions**: Baseline (stateless) and scenario modes. Scenario re-sends conversation history each turn, prices cache reads and writes per provider, and simulates compaction summarization calls.
- **Prompt format lab**: The same payload as TOON, JSON, compact JSON, YAML, XML, and CSV, with live token counts per format.
- **Token efficiency**: Cost-per-task comparison showing how a cheaper per-token model that emits more tokens can cost more overall, with an editable calculator seeded from published benchmark token counts.
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

`preview:cloudflare` serves the `out/` static export together with the Pages Function in `functions/api/pricing.ts`.

## Quality Checks

```bash
bun run lint
bun run typecheck
bun test
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
