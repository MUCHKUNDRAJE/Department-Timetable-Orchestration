'use client';

import React, { useEffect, useState } from 'react';
import { useTimetableStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { usePathname } from 'next/navigation';

export function HydrationGuard({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const hydrateFromApi = useTimetableStore((s) => s.hydrateFromApi);
  const apiError       = useTimetableStore((s) => s.apiError);
  const token          = useAuthStore((s) => s.token);
  const pathname       = usePathname();

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  useEffect(() => {
    setMounted(true);
    if (token && !isAuthPage) {
      hydrateFromApi();
    }
  }, [token, isAuthPage, hydrateFromApi]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="flex items-center gap-3 p-4 bg-surface rounded-2xl border border-border shadow-subtle">
          <div className="w-5 h-5 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <span className="text-sm font-medium text-foreground">Loading Timetable Studio...</span>
        </div>
      </div>
    );
  }

  const showBanner =
    apiError &&
    !isAuthPage &&
    token &&
    !apiError.toLowerCase().includes('token') &&
    !apiError.toLowerCase().includes('auth') &&
    !apiError.toLowerCase().includes('unauthorized');

  return (
    <>
      {showBanner && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white text-sm px-4 py-2 flex items-center gap-2">
          <span className="font-semibold">⚠ API Error:</span>
          <span>{apiError}</span>
          <span className="ml-auto opacity-75">Ensure the backend is running at {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}</span>
        </div>
      )}
      {children}
    </>
  );
}
