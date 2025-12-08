'use client';
import { useTheme } from './ThemeProvider';
import { themes, ThemeName } from '../lib/themes';
import { useState, useRef, useEffect, useCallback, useMemo } from 'react';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const themeOptions = useMemo<ThemeName[]>(() => ['night', 'dawn'], []);

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
  }, [isOpen, focusedIndex, theme, setTheme, themeOptions]);

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
        className="glass-select flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-rose-text transition-all hover:border-rose-iris focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/30 shadow-lg"
        aria-label="Select theme"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-rose-iris sm:w-4 sm:h-4"
        >
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v6m0 6v6m5.66-13A10 10 0 0 1 12 22a10 10 0 0 1-6.66-17" />
        </svg>
        <span className="hidden xs:inline sm:inline">{themes[theme].name}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div 
            ref={menuRef}
            role="listbox"
            aria-label="Theme options"
            className="glass-card absolute right-0 top-full z-20 mt-2 w-48 sm:w-56 rounded-lg sm:rounded-xl border border-rose-highlightHigh/60 backdrop-blur-2xl shadow-[0_30px_80px_-40px_rgba(0,0,0,0.65)]"
          >
            <div className="p-1.5 sm:p-2 grid gap-1">
              {themeOptions.map((themeName) => (
                <button
                  key={themeName}
                  role="option"
                  aria-selected={theme === themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setIsOpen(false);
                    buttonRef.current?.focus();
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-rose-iris/50 ${
                    theme === themeName
                      ? 'bg-rose-iris/18 text-rose-foam font-semibold border border-rose-iris/50'
                      : 'text-rose-text hover:bg-rose-highlightMed/60 border border-transparent'
                  }`}
                >
                  <span>{themes[themeName].name}</span>
                  {theme === themeName && (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-rose-iris"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
