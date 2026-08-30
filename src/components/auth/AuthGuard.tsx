'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/auth-store';
import { Building2 } from 'lucide-react';

const PUBLIC_ROUTES = ['/login', '/signup'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, token, logout } = useAuthStore();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    const handleUnauthorized = () => {
      logout();
      router.replace(`/login?from=${encodeURIComponent(pathname || '/select')}`);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => {
      window.removeEventListener('auth:unauthorized', handleUnauthorized);
    };
  }, [logout, router, pathname]);

  useEffect(() => {
    if (!isMounted) return;

    const isPublic = PUBLIC_ROUTES.includes(pathname);

    if (!token && !isPublic) {
      router.replace(`/login?from=${encodeURIComponent(pathname || '/select')}`);
    } else if (token && isPublic) {
      router.replace('/select');
    }
  }, [isMounted, pathname, token, router]);

  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-lg animate-pulse">
            <Building2 className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted tracking-wider uppercase">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            Loading Timetable Studio...
          </div>
        </div>
      </div>
    );
  }

  const isPublic = PUBLIC_ROUTES.includes(pathname);

  // If unauthenticated trying to view protected route, show transition loader while redirecting
  if (!token && !isPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted">Redirecting to login...</p>
        </div>
      </div>
    );
  }

  // If authenticated trying to view login/signup, show transition loader while redirecting
  if (token && isPublic) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted">Entering portal...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
