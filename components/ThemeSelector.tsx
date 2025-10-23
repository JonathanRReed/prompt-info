'use client';
import { useTheme } from './ThemeProvider';
import { themes, ThemeName } from '../lib/themes';
import { useState } from 'react';

export default function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const themeOptions: ThemeName[] = ['night', 'moon', 'dawn'];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border border-rose-highlightMed bg-rose-surface/80 backdrop-blur-lg px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium text-rose-text transition-all hover:border-rose-iris focus:border-rose-iris focus:outline-none focus:ring-2 focus:ring-rose-iris/30 shadow-lg"
        aria-label="Select theme"
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
          <div className="absolute right-0 top-full z-20 mt-2 w-48 sm:w-56 rounded-lg sm:rounded-xl border border-rose-highlightMed bg-rose-surface/95 backdrop-blur-xl shadow-2xl">
            <div className="p-1.5 sm:p-2">
              {themeOptions.map((themeName) => (
                <button
                  key={themeName}
                  onClick={() => {
                    setTheme(themeName);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-left text-xs sm:text-sm transition-all ${
                    theme === themeName
                      ? 'bg-rose-iris/20 text-rose-iris font-semibold'
                      : 'text-rose-text hover:bg-rose-highlightMed/50'
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
