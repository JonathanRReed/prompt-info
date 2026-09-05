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
  { href: '/', label: 'Cost Calculator', shortLabel: 'Calculator', description: 'Estimate request, session, and recurring AI costs' },
  { href: '/format-comparison/', label: 'Format Comparison', shortLabel: 'Formats', description: 'Compare TOON, JSON, YAML, XML, and CSV' },
  { href: '/token-efficiency/', label: 'Cost per Task', shortLabel: 'Per task', description: 'Combine token rates with measured output length' },
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
      <nav className="eco-nav hidden sm:flex" aria-label="Main navigation">
        {navItems.map(item => {
          const isActive = normalizedPathname === normalizePath(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="eco-nav-link"
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="hidden lg:inline">{item.label}</span>
              <span className="lg:hidden">{item.shortLabel}</span>
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
        className="eco-icon-btn eco-menu-btn sm:hidden"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
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
        className="m-auto w-[calc(100%-2rem)] max-w-md border border-rose-highlightMed bg-rose-base p-0 text-rose-text backdrop:bg-black/70 backdrop:backdrop-blur-sm sm:hidden"
      >
        <div className="flex items-center justify-between border-b border-rose-highlightMed p-3">
          <span className="text-sm font-semibold">Menu</span>
          <button
            type="button"
            onClick={() => closeMenu()}
            aria-label="Close navigation menu"
            className="eco-icon-btn eco-menu-btn"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
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
                className={`grid min-h-16 content-center gap-1 bg-rose-base px-5 py-4 transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-rose-love motion-reduce:transition-none ${
                  isActive ? 'shadow-[inset_3px_0_0_var(--signal)]' : 'hover:bg-rose-overlay'
                }`}
              >
                <span className="text-base font-semibold">{item.label}</span>
                <span className="text-sm text-rose-muted">{item.description}</span>
              </Link>
            );
          })}
        </nav>
      </dialog>
    </>
  );
}
