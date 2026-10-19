# Next.js lint adaptations

The two local rules in this directory and the explicit ESLint configuration
are adapted from Next.js 16.3.8:

- https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-plugin-next/src/rules/no-location-assign-relative-destination.ts
- https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-plugin-next/src/rules/no-html-link-for-pages.ts
- https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-plugin-next/src/utils/url.ts
- https://github.com/vercel/next.js/blob/v16.3.8/packages/eslint-config-next/src/index.ts

Changes: remove TypeScript annotations from the location rule and bound cyclic
initializer traversal; use explicit node:fs route discovery for the link rule;
replace the preset's Next rules with Oxlint plus these two local equivalents.

Original license, from https://github.com/vercel/next.js/blob/v16.3.8/license.md:

The MIT License (MIT)

Copyright (c) 2025 Vercel, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
