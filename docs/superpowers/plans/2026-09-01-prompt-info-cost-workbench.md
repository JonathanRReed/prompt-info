# Prompt Info Cost Workbench Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Renovate Prompt Info into a fast, private, source-transparent AI workload cost workbench that compares credible models and explains request, session, monthly, and annual cost in the first viewport.

**Architecture:** Keep the Next.js 16 static export and Cloudflare Pages Functions deployment. Extract shared catalog normalization, timeout, provenance, and fallback logic into server-safe modules used by both runtime adapters. Keep the active scenario in browser memory. Build cost comparisons and three dependency-free charts from pure typed calculation helpers, then reorganize the existing monolithic client into focused workbench components without changing established routes.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind CSS 4, Bun 1.4, Cloudflare Pages Functions, Playwright, native SVG and CSS.

**Spec:** `PRODUCT.md` and `DESIGN.md` at repository root.

## Global Constraints

- Preserve the existing near-black, red, condensed-display, monospace-receipt visual grammar.
- Use Bun for install, scripts, and tests.
- Add no production dependency.
- Keep pasted prompt text in browser memory only.
- Make all upstream calls server-side and same-origin from the browser.
- Keep live, cached, and static fallback states visibly distinct.
- Preserve `/`, `/format-comparison`, `/token-efficiency`, `/about`, and existing SEO routes.
- Use `apply_patch` for source changes.
- Follow red, green, refactor for every behavior change.
- Run focused checks during implementation and broad checks only at integration milestones.

---

### Task 1: Define the catalog response and timeout contract

**Files:**

- Create: `lib/catalogContract.ts`
- Create: `lib/catalogContract.test.ts`
- Create: `lib/pricingCatalog.ts`
- Create: `lib/pricingCatalog.test.ts`
- Modify: `lib/artificialAnalysis.ts`
- Modify: `lib/artificialAnalysis.test.ts`

- [x] Write failing tests for a versioned pricing envelope with `data`, `source`, `sourceUrl`, `retrievedAt`, `freshness`, `isFallback`, and `fallbackReason`.
- [x] Write failing tests for invalid records, non-OK upstream responses, aborted fetches, and successful OpenRouter and Supabase catalog responses.
- [x] Write failing tests proving upstream fetches abort at the configured timeout and fall back without leaking credentials.
- [x] Add shared catalog types, validation helpers, JSON response headers, an abortable fetch helper, and a deterministic clock injection for tests.
- [x] Move pricing source selection and text-model filtering into `lib/pricingCatalog.ts`.
- [x] Add equivalent timeout and provenance fields to the Artificial Analysis catalog builder while preserving its existing dated fallback.
- [x] Run `bun test lib/catalogContract.test.ts lib/pricingCatalog.test.ts lib/artificialAnalysis.test.ts`.

### Task 2: Make runtime API adapters thin and consistent

**Files:**

- Modify: `app/api/pricing/route.ts`
- Modify: `functions/api/pricing.ts`
- Modify: `app/api/benchmarks/route.ts`
- Modify: `functions/api/benchmarks.ts`
- Create: `tests/api-adapters.test.ts`

- [x] Write failing adapter tests proving the Next and Cloudflare handlers return the same schema and cache headers for success and fallback states.
- [x] Replace duplicated pricing fetch and normalization logic with calls to `buildPricingCatalogResponse`.
- [x] Keep Next route handlers static-export-safe by avoiding request-dependent behavior.
- [x] Keep Cloudflare environment access isolated to its adapter.
- [x] Return a usable labeled fallback with HTTP 200 when fallback data is valid, and reserve 5xx for responses with no usable data.
- [x] Run `bun test tests/api-adapters.test.ts`.

### Task 3: Remove browser-to-provider networking

**Files:**

- Modify: `lib/fetchPricing.ts`
- Create: `lib/fetchPricing.test.ts`
- Modify: `public/_headers`
- Modify: `README.md`

- [x] Write failing tests proving the client only tries `/api/pricing` and `/api/pricing/`, validates the envelope, and exposes provenance with the pricing map.
- [x] Write a failing test proving a same-origin failure never triggers a request to OpenRouter or Artificial Analysis.
- [x] Remove the direct OpenRouter fallback and row parsing from the browser helper.
- [x] Tighten CSP `connect-src` to same-origin plus the existing Cloudflare analytics endpoint.
- [x] Document the private browser-only prompt boundary and same-origin catalog boundary.
- [x] Run `bun test lib/fetchPricing.test.ts` and `bun run lint`.

### Task 4: Build pure comparison and chart data helpers

**Files:**

- Create: `lib/costComparison.ts`
- Create: `lib/costComparison.test.ts`
- Modify: `lib/modelSelection.ts`
- Modify: `lib/modelSelection.test.ts`

- [x] Write failing tests for two and three model comparisons using request, session, monthly, and annual totals.
- [x] Write failing tests for token composition and cumulative per-turn series, including cache reads, cache writes, and compaction.
- [x] Write failing tests for explicit recommendation criteria, missing rates, ties, zero-cost rows, and partial data.
- [x] Write failing tests for credible default selection that favors current broadly useful provider families and excludes unusable pricing rows.
- [x] Implement typed pure helpers that consume existing `sessionMath` and `workloadMath` results rather than duplicating pricing equations.
- [x] Keep recommendations scoped to `lowest cost among selected models` or another visible criterion.
- [x] Run `bun test lib/costComparison.test.ts lib/modelSelection.test.ts lib/sessionMath.test.ts lib/workloadMath.test.ts`.

### Task 5: Build accessible dependency-free visualizations

**Files:**

- Create: `components/charts/CostByModelChart.tsx`
- Create: `components/charts/TokenCompositionChart.tsx`
- Create: `components/charts/SessionAccumulationChart.tsx`
- Create: `components/charts/chartFormat.ts`
- Create: `components/charts/chartFormat.test.ts`

- [x] Write failing formatter and geometry tests for zero, tiny, large, tied, and partial values.
- [x] Implement sorted horizontal cost bars with exact visible values and a table equivalent.
- [x] Implement a labeled stacked composition bar with a legend and table equivalent.
- [x] Implement a semantic SVG cumulative session path with point labels and a turn-by-turn table.
- [x] Add accessible names, descriptions, focus behavior, and non-color status cues.
- [x] Respect reduced motion with CSS only.
- [x] Run `bun test components/charts/chartFormat.test.ts` and `bun run typecheck`.

### Task 6: Extract the unified workbench from the homepage monolith

**Files:**

- Create: `components/workbench/ScenarioInputs.tsx`
- Create: `components/workbench/ModelComparison.tsx`
- Create: `components/workbench/CostReceipt.tsx`
- Create: `components/workbench/CostWorkbench.tsx`
- Create: `components/workbench/SourceStatus.tsx`
- Modify: `app/page-client.tsx`
- Modify: `components/ModelSelect.tsx`

- [x] Add failing browser-level component expectations to `tests/e2e/product-flows.spec.ts` for the first-view scenario controls, two credible default models, receipt totals, and source status.
- [x] Extract reusable scenario inputs while preserving core calculations, tokenizers, export, and scenario-provider behavior, replacing preset clutter with explicit fields.
- [x] Add two-model defaults and allow a third comparison with a hard maximum of three.
- [x] Wire comparison totals and chart series through the pure helpers from Task 4.
- [x] Keep session behavior and recurring workload controls explicit while disclosing automatic cache and compaction assumptions beside the evidence.
- [x] Keep export code out of the initial interaction path and load it only when export is invoked.
- [x] Delete superseded branches from `app/page-client.tsx` after behavior is covered.
- [x] Run `bun run typecheck`, `bun test`, and the focused Playwright homepage tests.

### Task 7: Recompose the homepage around the first-viewport workbench

**Files:**

- Modify: `app/page.tsx`
- Modify: `styles/globals.css`
- Modify: `components/Navigation.tsx`
- Modify: `app/layout.tsx`
- Modify: `lib/seo.ts`

- [x] Add failing E2E expectations that the calculator, selected models, and primary total are within the first 900 px at 1440 x 900 and 1024 x 768.
- [x] Replace the oversized 68dvh opening and four-card feature strip with compact product copy plus the workbench.
- [x] Apply the 7:5 desktop workbench and 4:4:4 chart grids from `DESIGN.md`, with single-column collapse on narrow screens.
- [x] Preserve receipt perforation, red offset shadow, grid texture, theme variables, and existing routes.
- [x] Add stable loading states, partial-data warnings, fallback banners, empty states, and error recovery controls.
- [x] Update metadata and structured data to describe a free AI workload cost workbench without unverifiable superlatives.
- [x] Verify focus visibility, native labels, 44 px mobile targets, `inputmode`, reduced motion, and no horizontal overflow.
- [x] Run `bun run lint`, `bun run typecheck`, and focused desktop/mobile Playwright tests.

### Task 8: Connect the labs and methodology to the active scenario

**Files:**

- Modify: `app/format-comparison/page-client.tsx`
- Modify: `app/token-efficiency/page-client.tsx`
- Modify: `app/about/page.tsx`
- Modify: `components/ScenarioProvider.tsx`
- Modify: `tests/e2e/product-flows.spec.ts`

- [x] Add failing E2E tests proving prompt, model, token plan, and workload remain available when navigating between the workbench and each lab during one browser session.
- [x] Surface the active scenario summary at the top of each lab.
- [x] Label benchmark source, retrieved date, fallback state, and missing fields beside efficiency results.
- [x] Update About with pricing, tokenizer, benchmark, privacy, freshness, and fallback methodology.
- [x] Confirm no client storage or network payload contains pasted prompt text.
- [x] Run the scenario, format, efficiency, and privacy browser coverage.

### Task 9: Add production-focused browser coverage

**Files:**

- Modify: `tests/e2e/product-flows.spec.ts`
- Modify: `tests/e2e/mobile-navigation.spec.ts`
- Create: `tests/e2e/workbench-states.spec.ts`

- [x] Cover the happy path from prompt to comparison, chart, receipt, and export.
- [x] Cover same-origin API loading, live source, static fallback, invalid or empty responses, and total request failure.
- [x] Cover keyboard navigation, disclosures, model add/remove, focus behavior, and theme control.
- [x] Cover 375 x 812, 768 x 1024, 1024 x 768, and 1440 x 900 with no horizontal overflow.
- [x] Assert no browser request targets OpenRouter, Artificial Analysis, or Supabase.
- [x] Assert no page or request payload exposes the pasted sentinel prompt.
- [x] Run `PREVIEW_PORT=4199 bun run test:e2e` against the Cloudflare Pages preview.

### Task 10: Full verification, review, commit, push, and launch

**Files:**

- Modify only as required by verified findings.

- [ ] Run `bun run lint`.
- [ ] Run `bun run typecheck`.
- [ ] Run `bun run test`.
- [ ] Run `bun run build`.
- [ ] Run `PREVIEW_PORT=4199 bun run test:e2e`.
- [ ] Run `bun audit`.
- [ ] Run a post-change security diff scan and repair every validated high-confidence finding within scope.
- [ ] Inspect the rendered local app at all four required viewport sizes and capture evidence for workbench position, chart readability, focus, error state, and no overflow.
- [ ] Review `git diff`, secret-scan changed files, and verify the worktree contains only intended changes.
- [ ] Commit with a conventional commit message and push `main` to `origin`.
- [ ] Verify the remote SHA matches local HEAD.
- [ ] Verify the Cloudflare Pages production deployment reports the same source SHA.
- [ ] Verify uncached production `/`, `/format-comparison`, `/token-efficiency`, `/about`, `/api/pricing`, and `/api/benchmarks` responses.
- [ ] Re-run the primary desktop and mobile production flows and inspect browser console and failed requests.
- [ ] Record remaining external platform warnings separately from product defects.
