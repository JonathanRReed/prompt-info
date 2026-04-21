'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  shortLabel: string;
  description: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Token Planner', shortLabel: 'Planner', description: 'Count tokens and estimate costs' },
  { href: '/format-comparison', label: 'Format Comparison', shortLabel: 'Formats', description: 'Compare TOON, JSON, YAML, XML, CSV' },
  { href: '/about', label: 'About', shortLabel: 'About', description: 'What this utility does' },
  { href: '/contact', label: 'Contact', shortLabel: 'Contact', description: 'Contact Hello.World Consulting' },
];

export default function Navigation() {
  const pathname = usePathname();
  const normalizedPathname = pathname.length > 1 ? pathname.replace(/\/$/, '') : pathname;

  return (
    <nav className="flex min-w-0 items-center border border-rose-highlightMed" role="navigation" aria-label="Main navigation">
      {navItems.map(item => {
        const isActive = normalizedPathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex min-h-11 items-center border-r border-rose-highlightMed px-3 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition duration-200 last:border-r-0 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-rose-love motion-reduce:transition-none sm:px-5 ${
              isActive
                ? 'bg-rose-love text-white'
                : 'bg-rose-base text-rose-subtle hover:bg-rose-overlay hover:text-rose-text'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.shortLabel}</span>
            <span className="pointer-events-none absolute left-0 top-full z-50 mt-px hidden w-72 border border-rose-highlightMed bg-rose-base px-3 py-2 text-[11px] text-rose-muted opacity-0 transition-opacity group-hover:opacity-100 lg:block">
              {item.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
