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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('rose-pine-theme') as ThemeName | null;
    if (stored && themes[stored]) {
      setThemeState(stored);
      applyTheme(stored);
    } else {
      applyTheme('night');
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      const root = document.documentElement;
      const body = document.body;
      const colors = themes[theme].colors;
      
      if (theme === 'dawn') {
        root.style.setProperty('background-color', colors.base);
        body.style.setProperty('background-color', colors.base);
        body.style.setProperty('background-image', `linear-gradient(to bottom right, ${colors.base}, ${colors.overlay}, ${colors.base})`);
        root.setAttribute('data-theme', 'light');
      } else if (theme === 'moon') {
        // Moon theme with blue-purple tint
        const tintedBg = `linear-gradient(to bottom right, #000000, ${colors.base}60, ${colors.surface}40, #000000)`;
        root.style.setProperty('background-color', '#000000');
        body.style.setProperty('background-color', '#000000');
        body.style.setProperty('background-image', tintedBg);
        root.setAttribute('data-theme', 'dark');
      } else {
        // Night theme with purple tint
        const tintedBg = `linear-gradient(to bottom right, #000000, ${colors.base}40, #000000)`;
        root.style.setProperty('background-color', '#000000');
        body.style.setProperty('background-color', '#000000');
        body.style.setProperty('background-image', tintedBg);
        root.setAttribute('data-theme', 'dark');
      }
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeName) => {
    setThemeState(newTheme);
    localStorage.setItem('rose-pine-theme', newTheme);
    applyTheme(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {mounted ? children : <div className="min-h-screen" />}
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
