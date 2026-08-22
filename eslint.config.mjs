import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';

export default defineConfig([
  ...nextVitals,
  {
    rules: {
      // This interface intentionally uses effects to coordinate async model
      // loading, tokenization, theme hydration, observers, and animation state.
      // The React 19 rule treats those state-machine transitions as errors even
      // though they synchronize with external browser systems.
      'react-hooks/set-state-in-effect': 'off',
    },
  },
  globalIgnores([
    '.next/**',
    'out/**',
    'dist/**',
    'build/**',
    'coverage/**',
    'next-env.d.ts',
  ]),
]);
