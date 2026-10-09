# Dependency maintenance — October 9, 2026

This update keeps the static export and application code unchanged. It does not
change the CI audit command or add security exceptions.

## Selected releases

- Next and eslint-config-next 16.3.8, including their matching Next packages.
- Wrangler 4.149.0: the first published Wrangler release using Miniflare
  5.20261006.1-alpha, which pins sharp 0.35.5 and Undici 7.29.1. This preserves
  Cloudflare's supported dependency pairing without overrides. Its associated
  workerd, esbuild and unenv-preset changes follow the official release.
- Compatible transitive lock updates: MCP SDK 1.31.0, brace-expansion 1.1.21 and
  5.0.12, fast-uri 3.1.8, ip-address 10.7.1, proxy-addr 2.0.8, sharp 0.35.5,
  source-map-js 1.2.2 and Undici 7.29.1.

Official registry metadata and maintainer repositories were checked. The old/new
transitive package tarballs were compared and their SHA-512 hashes verified
against registry integrity metadata. No install/postinstall hooks were present
in those nine targeted package comparisons; declared prepare hooks were not run.
This is not independent cryptographic verification of publisher attestations.
Installation used Bun 1.4.0 with a frozen lockfile and lifecycle scripts disabled.

## Remaining audit blocker

The October 9 registry audit falls from 31 advisory entries (28 distinct advisory
URLs, including a critical proxy-addr finding) to one high-severity finding:
[GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), affecting
braces 3.0.3. There is no published patched release. The
[upstream issue](https://github.com/micromatch/braces/issues/70) includes a
maintainer dispute; that does not make the repository's audit pass.

Observed dependency paths are micromatch → braces through fast-glob, including
Next's ESLint plugin and shadcn tooling. The Next ESLint path reads configured
project root globs. This project has no custom root glob setting, and its shadcn
application import is CSS. Source inspection found no application or Pages
Function that passes visitor input into these glob parsers. This is bounded
reachability evidence, not a claim that the dependency is universally safe.
No custom fork, ignored advisory or disabled quality gate is introduced.

## Local qualification

On the cloud test machine (Node 24.19.0, Bun 1.4.0):

- 106 unit and API-adapter tests pass, including nine dependency regressions.
- The lockfile floor check fails against the authentic previous lockfile and
  passes against this update. Compatibility checks exercise IP family isolation,
  proxy trust boundaries, header rejection, image processing, source maps,
  URI handling and normal brace expansion.
- ESLint, TypeScript, production static export and six rendered SEO checks pass.
- Wrangler 4.149.0 compiles both Pages Functions successfully.
- Local Pages preview cannot start: `uv_interface_addresses` returns system
  error 1 in this environment. Browser E2E, including mobile, was not run.
- `bun audit` still exits 1 for braces. The complete CI gate is not green.

The previous Cloudflare Pages preview also failed, without an accessible
explanatory log. A new exact-head preview must succeed before merge; local build
success does not establish that the hosted deployment problem is resolved.

## Primary release references

- [Next 16.3.8](https://github.com/vercel/next.js/releases/tag/v16.3.8)
- [Wrangler 4.149.0](https://github.com/cloudflare/workers-sdk/releases/tag/wrangler@4.149.0)
- [Miniflare 5.20261006.1-alpha](https://github.com/cloudflare/workers-sdk/releases/tag/miniflare@5.20261006.1-alpha)
- [Undici 7.29.1](https://github.com/nodejs/undici/releases/tag/v7.29.1)
