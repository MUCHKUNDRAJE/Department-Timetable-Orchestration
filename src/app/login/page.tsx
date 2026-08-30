'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Building2, Lock, User, Eye, EyeOff, ArrowRight, ShieldCheck, AlertCircle } from 'lucide-react';
import { useAuthStore } from '@/lib/auth-store';
import { INSTITUTION_INFO } from '@/lib/constants';
import { toast } from '@/lib/toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get('from') || '/select';

  const { login, isLoading, error, clearError } = useAuthStore();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    clearError();

    if (!username.trim()) {
      setLocalError('Please enter your username.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    try {
      await login({ username: username.trim(), password });
      toast.success('Signed In Successfully', `Welcome back, @${username.trim()}!`);
      router.replace(from);
    } catch (err: any) {
      const msg = err.message || 'Login failed. Please verify your credentials.';
      setLocalError(msg);
      toast.error('Authentication Failed', msg);
    }
  };

  const displayedError = localError || error;

  return (
    <div className="w-full max-w-md">
      {/* Top Branding */}
      <div className="flex flex-col items-center text-center mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-md shadow-primary/20 mb-3 transform hover:scale-105 transition-transform">
          <Building2 className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          Sign In to Timetable Studio
        </h1>
        <p className="text-xs text-muted font-medium mt-1">
          {INSTITUTION_INFO.collegeName} • {INSTITUTION_INFO.department}
        </p>
      </div>

      {/* Login Card */}
      <div className="bg-surface border border-border rounded-2xl shadow-xl shadow-primary/5 p-6 sm:p-8 backdrop-blur-md">
        <div className="flex items-center justify-between pb-5 mb-5 border-b border-border/80">
          <div>
            <h2 className="text-base font-bold text-foreground">Authentication Required</h2>
            <p className="text-xs text-muted">Enter your institutional credentials to proceed</p>
          </div>
          <div className="p-2 rounded-xl bg-primary-light text-primary">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>

        {displayedError && (
          <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 text-xs flex items-start gap-2.5 animate-shake">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{displayedError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="username">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <User className="w-4 h-4" />
              </div>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (displayedError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                autoFocus
                autoComplete="username"
                placeholder="e.g. admin or faculty_id"
                className="w-full pl-10 pr-3.5 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-muted">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (displayedError) {
                    setLocalError(null);
                    clearError();
                  }
                }}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 bg-surface-subtle border border-border rounded-xl text-xs text-foreground placeholder:text-muted/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-muted hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-primary to-accent hover:from-primary-hover hover:to-primary text-white text-xs font-bold shadow-md shadow-primary/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Switch to Signup */}
        <div className="mt-6 pt-5 border-t border-border/80 text-center">
          <p className="text-xs text-muted">
            Don&apos;t have an administrator account?{' '}
            <Link
              href={`/signup?from=${encodeURIComponent(from)}`}
              className="font-bold text-primary hover:text-primary-hover hover:underline transition-colors ml-1"
            >
              Create Account
            </Link>
          </p>
        </div>
      </div>

      {/* Security badge note */}
      <div className="mt-4 text-center text-[11px] text-muted flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-primary" />
        <span>Encrypted with JWT & bcrypt authentication</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-10 px-4">
      <Suspense fallback={
        <div className="flex flex-col items-center gap-3">
          <span className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-muted">Loading sign in...</p>
        </div>
      }>
        <LoginForm />
      </Suspense>
    </div>
  );
}
