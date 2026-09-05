export type ThemeMode = 'dark' | 'light';
export type ThemeName = ThemeMode;

export type ThemeDefinition = {
  name: string;
  tone: string;
  mode: ThemeMode;
};

/**
 * Two themes, shared with the sibling sites. Colors live in CSS
 * (styles/ecosystem.css) keyed on the html[data-theme] attribute, so this
 * module only names them and applies the attribute.
 */
export const themes: Record<ThemeName, ThemeDefinition> = {
  dark: { name: 'Carbon', tone: 'Dark, red, high contrast', mode: 'dark' },
  light: { name: 'Ledger paper', tone: 'Light, warm paper, red ink', mode: 'light' },
};

export const THEME_STORAGE_KEY = 'theme';
const LEGACY_STORAGE_KEY = 'rose-pine-theme';
const LEGACY_LIGHT_NAMES = new Set(['ledger', 'blueprint', 'clay']);

export function isThemeName(value: unknown): value is ThemeName {
  return value === 'dark' || value === 'light';
}

/** Reads the stored theme, migrating the older six-way selector value. */
export function readStoredTheme(): ThemeName {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeName(stored)) return stored;
    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return LEGACY_LIGHT_NAMES.has(legacy) ? 'light' : 'dark';
  } catch {
    // Storage can be blocked; fall through to the default.
  }
  return 'dark';
}

export function applyTheme(theme: ThemeName) {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.classList.toggle('light', theme === 'light');
  root.style.colorScheme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', theme === 'light' ? '#f4efe4' : '#0a0a0a');
}
