'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeName, applyTheme, readStoredTheme, THEME_STORAGE_KEY } from '../lib/themes';

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('dark');

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applyTheme(stored);
  }, []);

  const setTheme = (next: ThemeName) => {
    setThemeState(next);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage can be blocked; the theme still applies for this page.
    }
    applyTheme(next);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme: () => setTheme(theme === 'light' ? 'dark' : 'light') }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
}
