'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Calendar, Printer, Database, LayoutGrid, Sparkles, RotateCcw, Building2 } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { INSTITUTION_INFO } from '@/lib/constants';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const resetToSeedData = useTimetableStore((s) => s.resetToSeedData);
  const assignments = useTimetableStore((s) => s.assignments);
  const faculty = useTimetableStore((s) => s.faculty);

  const navLinks = [
    { href: '/select', label: 'Hub', icon: LayoutGrid },
    { href: '/schedule', label: 'Schedule Timetable', icon: Calendar },
    { href: '/print', label: 'Print / Export', icon: Printer },
    { href: '/data', label: 'Manage Data', icon: Database },
  ];

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border transition-all no-print">
      <div className="max-w-[1680px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Institution Brand */}
          <Link href="/select" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  TIMETABLE ALLOCATION
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-highlight/15 text-highlight">
                  Pro
                </span>
              </div>
              <p className="text-[11px] text-muted font-medium truncate max-w-[280px] sm:max-w-none">
                {INSTITUTION_INFO.department}
              </p>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 bg-surface-subtle p-1 rounded-xl border border-border">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                pathname === link.href || (link.href === '/select' && pathname === '/');
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150',
                    isActive
                      ? 'bg-surface text-primary shadow-sm border border-border font-bold'
                      : 'text-muted hover:text-foreground hover:bg-surface/50'
                  )}
                >
                  <Icon className={cn('w-3.5 h-3.5', isActive ? 'text-primary' : 'text-muted')} />
                  {link.label}
                </Link>
              );
            })}
          </nav>

          {/* Quick Info & Actions */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary-light/50 border border-primary/20 text-xs">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-muted-foreground">
                <strong className="text-primary font-bold">{assignments.length}</strong> slots |{' '}
                <strong className="text-primary font-bold">{faculty.length}</strong> faculty
              </span>
            </div>

            <button
              onClick={() => {
                if (confirm('Reset system data back to institutional default seed records?')) {
                  resetToSeedData();
                }
              }}
              title="Reset to default seed data"
              className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-subtle border border-border transition-colors flex items-center gap-1.5 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Data</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
