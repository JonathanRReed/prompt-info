# Prompt Info

**LLM Token Counter and Cost Calculator**

A product of [Hello.World Consulting](https://helloworldfirm.com).
Made by Jonathan Reed.

---

## Overview

Prompt Info is a browser-based LLM token counter and cost calculator. It allows you to check how many tokens are in a prompt before running a model request. You can paste draft text, choose a model, compare OpenAI tokenizer families, estimate output size, and export a planning receipt for multi-turn agent sessions.

Built with Next.js, TypeScript, and Tailwind CSS (Rosé Pine theme).

## Features

- **Token Analysis**: Real-time GPT-style BPE tokenization with support for `o200k_base`, `cl100k_base`, `p50k_base`, `p50k_edit`, and `r50k_base`.
- **Cost Calculator**: Estimate input, output, and multi-turn agent costs across a variety of models.
- **Agent Mode**: Calculate costs for multi-turn agent loops with configurable turn presets.
- **Prompt Format Lab**: Compare the same prompt across different formats including JSON, YAML, XML, CSV, and others for payload planning.
- **Receipt Export**: Generate and download an image receipt of your cost estimate.
- **Performance Optimized**: Built for speed and ready for static export.

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
   bun run start
   ```

---

For more info, visit [helloworldfirm.com](https://helloworldfirm.com)

## License

Licensed under the Functional Source License, Version 1.1, MIT Future License.
This repository is source-available today and converts to MIT two years after
each version is made available. See [`LICENSE`](./LICENSE).
