'use client';

import React, { useEffect, useState } from 'react';
import { useTimetableStore } from '@/lib/store';

export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const hydrateFromStorage = useTimetableStore((s) => s.hydrateFromStorage);

  useEffect(() => {
    hydrateFromStorage();
    setMounted(true);
  }, [hydrateFromStorage]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-border shadow-subtle">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-foreground">Loading Timetable Engine...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
