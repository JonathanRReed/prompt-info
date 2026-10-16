# Temporary development dependency exception

Approved on October 15, 2026 (Central Time), only for GHSA-vfj7-8cjw-p6xm in braces 3.0.3. Expires at 2026-10-20 05:00 UTC, the end of October 19 Central Time. No other advisory or repository is covered by this record.

The affected chain is eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces. It is used for linting. Deeply nested malicious patterns can exhaust the Node.js stack. The upstream advisory currently lists no patched release: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm . Avoid untrusted lint configuration and glob inputs.

Run `bun run audit`. The check requires a successful, clean production audit and permits only this exact advisory before expiry with the reviewed consumer graph in `dependency-exception.json`. New consumers, altered versions, other advisories, invalid responses, command errors, or an expired exception block. It never lowers a severity threshold or treats a failed audit as a clean result.

When an upstream fix is available, update the dependency, rerun the complete checks, and remove the exception record and special handling. Do not extend the expiration without a new decision.
