'use client';

import React, { useEffect, useState } from 'react';
import { useTimetableStore } from '@/lib/store';

export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const hydrateFromApi = useTimetableStore((s) => s.hydrateFromApi);
  const apiError       = useTimetableStore((s) => s.apiError);

  useEffect(() => {
    hydrateFromApi().finally(() => setMounted(true));
  }, [hydrateFromApi]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-border shadow-subtle">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-foreground">Connecting to Timetable API...</span>
        </div>
      </div>
    );
  }

  return (
    <>
      {apiError && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm px-4 py-2 flex items-center gap-2">
          <span className="font-semibold">⚠ API Unavailable:</span>
          <span>{apiError}</span>
          <span className="ml-auto opacity-75">Ensure the backend is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</span>
        </div>
      )}
      {children}
    </>
  );
}
