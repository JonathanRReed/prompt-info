# Dependency-security coverage retained from PR 5

PR 5 (`1d48e0a63d86c64cab686899a080f24d79be4518`) was an October 9 dependency-maintenance proposal. Its upgrades and unresolved audit description are historical, not the current release status. PR 15 merged as `f6e4cd2c6323c04d34a2fb8df14969f51f930c2a`, upgrading Next to 16.4.3 and retaining the removal of the vulnerable Next lint dependency chain. The merged release's dependency audits passed.

This follow-up preserves useful coverage from PR 5 without restoring removed dependencies or carrying forward obsolete vulnerability claims.

## Retained

`lib/dependencySecurity.test.ts` retains six checks, automatically included by the existing `lib/*.test.ts` command:

- Every locked copy of Next, sharp, source-map-js, Undici, and brace-expansion meets its reviewed floor. Next's floor is now 16.4.1, following the October 14 security update; the selected release is 16.4.3.
- Undici preserves ordinary headers and rejects CRLF header injection.
- Sharp produces a decodable PNG with the expected dimensions.
- Source maps preserve original positions and reject amplified section line offsets.
- Ordinary brace expansion still works.

These checks do not replace the unfiltered dependency audit or claim that the listed versions are free of all future advisories.

## Superseded or omitted

- `eslint-config-next`, `@modelcontextprotocol/sdk`, `ip-address`, `proxy-addr`, and `fast-uri` are absent from the merged lockfile. Their presence floors are not retained.
- The three behavior tests for IP address-family separation, proxy subnet trust, and URI serialization are omitted because the corresponding packages are no longer installed. No dependencies are added merely to keep those historical tests running.
- PR 5's Next 16.3.8 and Wrangler 4.149.0 upgrades are superseded by merged Next 16.4.3 and Wrangler 4.151.0. Its compatible retained security dependencies remain at or above the original floors.
- PR 5's statement that braces 3.0.3 still blocks the audit applies to that old branch only. Main no longer contains braces. The separate brace-expansion package remains installed and retains its floor/behavior checks. No exception is extended or relaxed.

The original historical proposal and full nine-case suite remain readable in [PR 5](https://github.com/JonathanRReed/prompt-info/pull/5) and its [commit](https://github.com/JonathanRReed/prompt-info/commit/1d48e0a63d86c64cab686899a080f24d79be4518). Close PR 5 as superseded only after this retained coverage is reviewed and merged; do not merge its stale lockfile or reinstall removed tooling.

Security release reference: [Next.js October 14 update](https://nextjs.org/blog/nextjs-security-update-october-14-2026).
