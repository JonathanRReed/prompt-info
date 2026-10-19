# Lint coverage without the Next glob dependency

`bun run lint` runs ESLint and then Oxlint 1.81.0. Both are required. ESLint
keeps the exact React, Hooks, accessibility, import, globals, parser and resolver
configuration expanded from the old `eslint-config-next` 16.3.8 preset. Those
packages are now explicit, pinned development dependencies. In particular,
React Hooks 7.1.1 `recommended` has 16 rules, including compiler diagnostics;
the existing `set-state-in-effect` exemption is unchanged.

Oxlint runs the 20 equivalent Next rules in `.oxlintrc.json` at the previous
Core Web Vitals severities. Its default correctness category is off because
this file explicitly enumerates the migrated rules; ESLint retains the other
existing checks. Oxlint uses one thread. It covers the original JS, JSX, MJS,
CJS, TS, TSX, MTS and CTS extensions and shares the build-output exclusions.

Two Next rules stay in the attributed local ESLint plugin:

- `no-location-assign-relative-destination` is adapted from the pinned original
  rule. It retains constant/prefix evaluation, last assignments, computed
  properties and lexical shadowing checks. Cyclic initializer traversal is
  bounded to avoid crashing the linter.
- `no-html-link-for-pages` discovers actual `pages` and App Router `page`
  endpoints with `node:fs`. It covers dynamic and catch-all routes, route groups,
  parallel routes, query strings and fragments. Public assets, API handlers,
  private app directories and non-route helpers are not page routes. Download
  links and `_blank` retain their exemptions. It accepts explicit project roots;
  a future glob `settings.next.rootDir` fails visibly rather than disabling the
  rule. This single-root repository does not configure a root glob or custom
  page extensions.

The local route check deliberately catches static App Router page links that
the installed Next 16.3.8 rule missed in the differential fixtures. It also
recognizes dots inside a real dynamic route segment rather than assuming every
dot means an asset. No existing rule was disabled to achieve a clean audit.
The CSS replacement already on main and all product source are unchanged.

`bun run test` includes the lint regressions. `tests/lint/upstream-diagnostics.json`
records diagnostics from the original installed Next 16.3.8 rules. The fixtures
exercise every removed rule with positive and negative examples and compare
rule identity and severity against the hybrid configuration. Other tests check
the complete non-Next rule/options expansion and real Hooks compiler, Hooks
dependency, accessibility, React and import failures. This bounds the tested
equivalence; it is not a claim of exhaustive parity for every possible program.

To regenerate upstream diagnostics, use a separate clean checkout of baseline
`8d3c4cc` with its frozen dependencies, then run this checkout's recorder with
`UPSTREAM_ROOT=/absolute/path/to/baseline node tests/lint/record-upstream.mjs`.
Review the resulting fixture changes. Do not add the vulnerable original preset
back to this project's development dependencies just to run a differential test.

The removal targets `eslint-config-next → @next/eslint-plugin-next → fast-glob
→ micromatch → braces`. Always run the unfiltered `bun audit` after changing the
dependency graph. The existing exception expiry and fail-closed audit wrapper
are unchanged by this lint migration; a clean raw audit does not use the exception.
Attribution and the original MIT license are in
`scripts/lint/THIRD_PARTY_NOTICES.md`.
