# Prompt Info

Estimate model usage costs for a prompt, multi-turn session, or recurring workload. Compare model prices and token counts, inspect the assumptions, and export an image receipt.

Built by Jonathan R. Reed for [Hello.World Consulting](https://helloworldfirm.com).

## Calculations

The calculator uses OpenRouter pricing with database and static fallbacks. It separates input and output costs and displays rates per million tokens. The planner counts pasted text locally with `o200k_base`; the format lab offers additional BPE tokenizers. Provider counts can differ. Actual usage JSON can be imported locally. See [workload accounting](docs/workload-model.md) for assumptions and limitations.

Session estimates can model stateless calls or conversations that resend history each turn, with provider-specific cache reads, cache writes, and compaction calls. Recurring projections scale one request or session by daily, weekly, monthly, or batch volume. They cover model usage only, not infrastructure or other operating costs.

Format comparison measures the same payload as TOON, JSON, compact JSON, YAML, XML, and CSV. It reports token counts, wrapper overhead, and planner-model input cost. The task comparison uses attributed Artificial Analysis data and editable assumptions to show why a lower per-token price need not mean a cheaper task.

## Privacy and sources

Pasted text stays in browser memory. The active prompt and settings move between tools without persisting the text. The browser requests catalogs from same-origin routes, not directly from OpenRouter, Artificial Analysis, or Supabase.

| Setting | Use |
| --- | --- |
| `OPENROUTER_API_BASE_URL` | Override the model-pricing endpoint |
| `ARTIFICIAL_ANALYSIS_API_KEY` | Server-side Artificial Analysis catalog access; never sent to the browser |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` | Optional `aa_models` cache; existing `NEXT_PUBLIC_` equivalents are also supported |

Without live data, a dated three-model snapshot keeps the comparison usable. The interface identifies its source and leaves unavailable fields missing. Catalog routes validate upstream responses, enforce timeouts, and return freshness and fallback metadata.

## Develop

Requires Bun 1.4.4 and Node 22.12+. Use Node 24.22.1 LTS from `.nvmrc` for development. The Verify workflow targets Node 22.23.4 and 24.22.1 explicitly. The app uses Next.js 16.4.3, React 19.3.1, TypeScript, and Tailwind CSS 4.

```bash
bun install --frozen-lockfile
bun run dev
```

```bash
bun run lint
bun run typecheck
bun run test
bun run test:e2e
bun audit
bun run build
bun run preview:cloudflare
```

The Cloudflare preview serves `out/` with the Pages Functions in `functions/api/`. `bun run assets:social` regenerates the 1200×630 preview card.

## Deploy

Cloudflare Pages builds with `bun install --frozen-lockfile && bun run build` and publishes `out` at `prompt-info.helloworldfirm.com`.

## License

Functional Source License 1.1, MIT Future License. Each version converts to MIT two years after it is made available. See [LICENSE](LICENSE).
