'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  href: string;
  label: string;
  description: string;
};

const navItems: NavItem[] = [
  { href: '/', label: 'Token Planner', description: 'Count tokens & estimate costs' },
];

export default function Navigation() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2" role="navigation" aria-label="Main navigation">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`group relative flex items-center gap-1.5 rounded-lg sm:rounded-xl px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium transition-all ${
              isActive
                ? 'bg-rose-iris/20 text-rose-iris border border-rose-iris/40'
                : 'text-rose-subtle hover:text-rose-text hover:bg-rose-highlightMed/50 border border-transparent'
            }`}
            aria-current={isActive ? 'page' : undefined}
          >
            <span className="hidden sm:inline">{item.label}</span>
            <span className="sm:hidden">{item.label.split(' ')[0]}</span>
            
            {/* Tooltip on hover for desktop */}
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-rose-surface border border-rose-highlightMed px-3 py-2 text-xs text-rose-subtle opacity-0 shadow-xl transition-opacity group-hover:opacity-100 hidden lg:block">
              {item.description}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
