'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Printer, Database, LayoutGrid, Sparkles, RotateCcw, Building2, LogOut, User, Lock, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { useAuthStore } from '@/lib/auth-store';
import { INSTITUTION_INFO } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const resetToSeedData = useTimetableStore((s) => s.resetToSeedData);
  const assignments = useTimetableStore((s) => s.assignments);
  const faculty = useTimetableStore((s) => s.faculty);

  const { user, isAuthenticated, logout } = useAuthStore();
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const isAuthPage = pathname === '/login' || pathname === '/signup';

  const navLinks = [
    { href: '/select', label: 'Hub', icon: LayoutGrid },
    { href: '/schedule', label: 'Schedule Timetable', icon: Calendar },
    { href: '/print', label: 'Print / Export', icon: Printer },
    { href: '/data', label: 'Manage Data', icon: Database },
  ];

  const handleLogout = () => {
    logout();
    toast.info('Signed Out', 'You have been safely signed out of Timetable Studio.');
    router.replace('/login');
  };

  const handleOpenResetModal = () => {
    setResetPassword('');
    setResetError(null);
    setIsResetModalOpen(true);
  };

  const handleExecuteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetPassword) {
      setResetError('Please enter your password to confirm system reset.');
      return;
    }
    setIsResetting(true);
    setResetError(null);
    try {
      await resetToSeedData(resetPassword);
      toast.success(
        'Database Reset Complete',
        'All institutional classes, labs, faculty, rooms, and schedule have been reset.'
      );
      setIsResetModalOpen(false);
      setResetPassword('');
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Incorrect password.';
      setResetError(msg);
      toast.error('Reset Authorization Failed', msg);
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-md border-b border-border transition-all no-print">
      <div className="max-w-[1680px] mx-auto px-2 sm:px-4 lg:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Institution Brand */}
          <Link href={isAuthenticated ? '/select' : '/login'} className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
              {/* <Building2 className="w-5 h-5" />*/}
              <Image src="/image.png" alt="Logo" width={50} height={50} />

            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  Slotify
                </span>
                
              </div>
              <p className="text-[11px] text-muted font-medium truncate max-w-[280px] sm:max-w-none">
                {INSTITUTION_INFO.department}
              </p>
            </div>
          </Link>

          {/* Navigation Links - only visible when authenticated & not on auth pages */}
          {isAuthenticated && !isAuthPage && (
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
          )}

          {/* Quick Info & Actions */}
          <div className="flex items-center gap-3">
            {isAuthenticated && !isAuthPage ? (
              <>
                <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-primary-light/50 border border-primary/20 text-xs">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  <span className="text-muted-foreground">
                    <strong className="text-primary font-bold">{assignments.length}</strong> slots |{' '}
                    <strong className="text-primary font-bold">{faculty.length}</strong> faculty
                  </span>
                </div>

                {/* <button
                  onClick={handleOpenResetModal}
                  disabled={isResetting}
                  title="Reset to default seed data (Password Required)"
                  className="p-2 rounded-xl text-muted hover:text-foreground hover:bg-surface-subtle border border-border transition-colors flex items-center gap-1.5 text-xs font-medium disabled:opacity-60 cursor-pointer"
                >
                  {isResetting ? (
                    <span className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
                  ) : (
                    <RotateCcw className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{isResetting ? 'Resetting...' : 'Reset Data'}</span>
                </button> */}

                {/* Logged in user profile & Logout */}
                <div className="flex items-center gap-2 pl-2 border-l border-border">
                  <div className="hidden sm:flex flex-col items-end text-right">
                    <span className="text-xs font-bold text-foreground leading-tight truncate max-w-[120px]">
                      {user?.fullName || user?.username || 'Admin'}
                    </span>
                    <span className="text-[10px] text-primary font-semibold uppercase tracking-wider">
                      @{user?.username || 'admin'}
                    </span>
                  </div>
                  <button
                    onClick={handleLogout}
                    title="Sign Out"
                    className="p-2 rounded-xl bg-surface-subtle hover:bg-red-500/10 hover:text-red-600 hover:border-red-500/30 text-muted border border-border transition-all flex items-center gap-1.5 text-xs font-semibold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            ) : (
              !isAuthPage && (
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold shadow-sm hover:bg-primary-hover transition-colors flex items-center gap-1.5"
                >
                  <User className="w-4 h-4" />
                  <span>Sign In</span>
                </Link>
              )
            )}
          </div>
        </div>
      </div>

      {/* Password-Protected Reset Modal */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => {
          if (!isResetting) {
            setIsResetModalOpen(false);
            setResetPassword('');
            setResetError(null);
          }
        }}
        title="Security Verification: Reset System Data"
        description="This action will delete and restore all timetable assignments and records back to default state. Please enter your user password to authorize."
      >
        <form onSubmit={handleExecuteReset} className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-1">
              <strong className="text-rose-900 block font-bold">Admin Authentication Required</strong>
              <span>
                For institutional security, data deletion requires password confirmation. Entering the correct password will wipe and re-initialize the database.
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              Account Password *
            </label>
            <div className="relative">
              <input
                type={showResetPassword ? 'text' : 'password'}
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Enter your login password"
                autoFocus
                className="w-full px-3 py-2 text-xs rounded-xl border border-border bg-surface text-foreground placeholder:text-muted focus:outline-none focus:border-primary pr-10"
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(!showResetPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {resetError && (
            <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-rose-800 text-xs font-semibold flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{resetError}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => {
                setIsResetModalOpen(false);
                setResetPassword('');
                setResetError(null);
              }}
              disabled={isResetting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={isResetting || !resetPassword}
              className="gap-2 font-bold"
            >
              {isResetting ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isResetting ? 'Verifying & Resetting...' : 'Authenticate & Reset'}
            </Button>
          </div>
        </form>
      </Modal>
    </header>
  );
}
