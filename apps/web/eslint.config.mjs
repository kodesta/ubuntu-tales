import { createConfig } from '@ubuntu-tales/config/eslint';

/**
 * The shared config's `react: true` block enables `react-hooks/*` rules, but the
 * `eslint-plugin-react-hooks` package is not part of the Phase 1 dependency set, so ESLint 9 rejects
 * the config. Keep the non-React preset (typescript-eslint strict, browser globals) until the
 * plugin is added with the lint-hardening task.
 */
export default createConfig({ react: true, browser: true });
