'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ThemeName, themes, applyTheme } from '../lib/themes';

type ThemeContextType = {
  theme: ThemeName;
  setTheme: (theme: ThemeName) => void;
};

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>('night');

  useEffect(() => {
    const stored = localStorage.getItem('rose-pine-theme') as ThemeName | null;
    if (stored && themes[stored]) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme('night');
    }
  }, []);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('rose-pine-theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
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
