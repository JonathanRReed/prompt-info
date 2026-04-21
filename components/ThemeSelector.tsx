'use client';

import { useTheme } from './ThemeProvider';
import { themes, ThemeName } from '../lib/themes';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const themeOptions = useMemo<ThemeName[]>(() => Object.keys(themes) as ThemeName[], []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
        setFocusedIndex(themeOptions.indexOf(theme));
      }
      return;
    }

    switch (e.key) {
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        buttonRef.current?.focus();
        break;
      case 'ArrowDown':
        e.preventDefault();
        setFocusedIndex(prev => (prev + 1) % themeOptions.length);
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedIndex(prev => (prev - 1 + themeOptions.length) % themeOptions.length);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (focusedIndex >= 0) {
          setTheme(themeOptions[focusedIndex]);
          setIsOpen(false);
          buttonRef.current?.focus();
        }
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  }, [focusedIndex, isOpen, setTheme, theme, themeOptions]);

  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRef.current) {
      const buttons = menuRef.current.querySelectorAll('button');
      buttons[focusedIndex]?.focus();
    }
  }, [focusedIndex, isOpen]);

  return (
    <div className="relative" onKeyDown={handleKeyDown}>
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="flex min-h-11 items-center gap-2 border border-rose-highlightMed bg-rose-base px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none sm:px-4"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span className="theme-swatch" aria-hidden="true">
          <span style={{ backgroundColor: themes[theme].colors.base }} />
          <span style={{ backgroundColor: themes[theme].colors.surface }} />
          <span style={{ backgroundColor: themes[theme].colors.love }} />
        </span>
        <span className="hidden sm:inline">{themes[theme].name}</span>
        <span className="sm:hidden">Theme</span>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div
            ref={menuRef}
            role="listbox"
            aria-label="Theme options"
            className="absolute right-0 top-full z-20 mt-px w-[min(22rem,calc(100vw-1.5rem))] border border-rose-highlightMed bg-rose-base shadow-[12px_12px_0_var(--color-rose-love)]"
          >
            <div className="grid gap-px bg-rose-highlightMed">
              {themeOptions.map(themeName => (
                <button
                  key={themeName}
                  role="option"
                  aria-selected={theme === themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`grid min-h-16 w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 bg-rose-base px-4 text-left transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                    theme === themeName
                      ? 'text-rose-love'
                      : 'text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
                  }`}
                >
                  <span className="theme-swatch theme-swatch-lg" aria-hidden="true">
                    <span style={{ backgroundColor: themes[themeName].colors.base }} />
                    <span style={{ backgroundColor: themes[themeName].colors.surface }} />
                    <span style={{ backgroundColor: themes[themeName].colors.love }} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-mono text-[11px] font-bold uppercase tracking-[0.14em]">
                      {themes[themeName].name}
                    </span>
                    <span className="mt-1 block truncate text-xs font-medium normal-case tracking-normal text-rose-muted">
                      {themes[themeName].tone}
                    </span>
                  </span>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em]" aria-hidden="true">
                    {theme === themeName ? 'Active' : themes[themeName].mode}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
