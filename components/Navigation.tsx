'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Cost Workbench', shortLabel: 'Workbench', description: 'Compare request, session, and recurring AI costs' },
  { href: '/format-comparison/', label: 'Format Comparison', shortLabel: 'Formats', description: 'Compare TOON, JSON, YAML, XML, CSV' },
  { href: '/token-efficiency/', label: 'Token Efficiency', shortLabel: 'Efficiency', description: 'Compare cost per task, not per token' },
  { href: '/about/', label: 'About', shortLabel: 'About', description: 'What this utility does' },
  { href: '/contact/', label: 'Contact', shortLabel: 'Contact', description: 'Contact Hello.World Consulting' },
];

function normalizePath(path: string) {
  return path.length > 1 ? path.replace(/\/$/, '') : path;
}

export default function Navigation() {
  const pathname = usePathname();
  const normalizedPathname = normalizePath(pathname);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  const closeMenu = (restoreFocus = true) => {
    const dialog = dialogRef.current;
    if (dialog?.open) dialog.close();
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  };

  const openMenu = () => {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    dialog.showModal();
    setIsOpen(true);
  };

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    closeMenu(false);
  }, [pathname]);

  return (
    <>
      <nav className="hidden min-w-0 items-center border border-rose-highlightMed sm:flex" aria-label="Main navigation">
        {navItems.map(item => {
          const isActive = normalizedPathname === normalizePath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex min-h-11 items-center border-r border-rose-highlightMed px-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition duration-200 last:border-r-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none lg:px-5 ${
                isActive
                  ? 'bg-rose-love text-white'
                  : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
              }`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="hidden lg:inline">{item.label}</span>
              <span className="lg:hidden">{item.shortLabel}</span>
              <span className="pointer-events-none absolute left-0 top-full z-50 mt-px hidden w-72 border border-rose-highlightMed bg-rose-base px-3 py-2 text-[11px] text-rose-muted opacity-0 transition-opacity group-hover:opacity-100 xl:block">
                {item.description}
              </span>
            </Link>
          );
        })}
      </nav>

      <button
        ref={triggerRef}
        type="button"
        onClick={openMenu}
        aria-expanded={isOpen}
        aria-controls="mobile-primary-navigation"
        aria-label="Open navigation menu"
        className="flex min-h-11 min-w-11 items-center justify-center border border-rose-highlightMed bg-rose-base px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:text-rose-text focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none sm:hidden"
      >
        Menu
      </button>

      <dialog
        ref={dialogRef}
        id="mobile-primary-navigation"
        aria-label="Primary navigation"
        onCancel={event => {
          event.preventDefault();
          closeMenu();
        }}
        onClick={event => {
          if (event.target === event.currentTarget) closeMenu();
        }}
        className="m-auto w-[calc(100%-2rem)] max-w-md border border-rose-highlightMed bg-rose-base p-0 text-rose-text shadow-[12px_12px_0_var(--color-rose-love)] backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:hidden"
      >
        <div className="border-b border-rose-highlightMed p-3">
          <button
            type="button"
            onClick={() => closeMenu()}
            aria-label="Close navigation menu"
            className="ml-auto flex min-h-11 min-w-11 items-center justify-center border border-rose-highlightMed bg-rose-base px-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-rose-subtle transition duration-200 hover:border-rose-love hover:bg-rose-love hover:text-white focus:outline-none focus:ring-2 focus:ring-rose-love motion-reduce:transition-none"
          >
            Close
          </button>
        </div>
        <nav className="grid gap-px bg-rose-highlightMed" aria-label="Mobile primary navigation">
          {navItems.map(item => {
            const isActive = normalizedPathname === normalizePath(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => closeMenu(false)}
                aria-current={isActive ? 'page' : undefined}
                className={`grid min-h-20 content-center gap-2 bg-rose-base px-5 py-4 transition duration-200 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none ${
                  isActive
                    ? 'text-rose-love'
                    : 'text-rose-text hover:bg-rose-love hover:text-white'
                }`}
              >
                <span className="font-mono text-sm font-bold uppercase tracking-[0.14em]">{item.label}</span>
                <span className={isActive ? 'text-sm text-rose-subtle' : 'text-sm text-rose-muted'}>
                  {item.description}
                </span>
              </Link>
            );
          })}
        </nav>
      </dialog>
    </>
  );
}
