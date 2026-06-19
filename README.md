# Prompt Info

**LLM Token Counter and Cost Calculator**

A product of [Hello.World Consulting](https://helloworldfirm.com).
Made by Jonathan R. Reed.

---

## Overview

Prompt Info is a browser-based LLM token counter and cost calculator. Paste draft text, choose a model, compare OpenAI tokenizer families, inspect the assumptions, and export a planning receipt for multi-turn agent sessions.

Built with Next.js, TypeScript, and Tailwind CSS (Rosé Pine theme).

## Features

- **Token counting**: BPE tokenization with `o200k_base`, `cl100k_base`, `p50k_base`, `p50k_edit`, and `r50k_base`, plus per-provider calibration for vendors that bill with their own tokenizers.
- **Cost calculator**: Live pricing from OpenRouter with a static catalog fallback, input/output cost breakdowns, and per-million rate display.
- **Agent sessions**: Baseline (stateless) and scenario modes. Scenario re-sends conversation history each turn, prices cache reads and writes per provider, and simulates compaction summarization calls.
- **Prompt format lab**: The same payload as TOON, JSON, compact JSON, YAML, XML, and CSV, with live token counts per format.
- **Receipt export**: Download an image receipt of the estimate.

## Getting Started

1. **Install dependencies:**

   ```bash
   bun install
   ```

2. **Run locally:**

   ```bash
   bun run dev
   ```

3. **Build for production:**

   ```bash
   bun run build
   bun run start  # serves the static export from out/ via bunx serve@latest
   ```

---

For more info, visit [helloworldfirm.com](https://helloworldfirm.com)

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License.
This repository is source-available today and converts to MIT two years after
each version is made available. See [`LICENSE`](./LICENSE).
