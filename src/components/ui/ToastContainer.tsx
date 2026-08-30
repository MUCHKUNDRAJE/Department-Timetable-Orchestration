'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, AlertCircle, AlertTriangle, Sparkles, X } from 'lucide-react';
import { useToastStore, ToastType, ToastItem } from '@/lib/toast';

const ICONS: Record<ToastType, React.ElementType> = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Sparkles,
};

const STYLES: Record<
  ToastType,
  {
    badgeBg: string;
    badgeText: string;
    border: string;
    progressBg: string;
    glow: string;
  }
> = {
  success: {
    badgeBg: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
    badgeText: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-500/30',
    progressBg: 'bg-emerald-500',
    glow: 'shadow-emerald-500/10',
  },
  error: {
    badgeBg: 'bg-rose-500/15 text-rose-600 dark:text-rose-400',
    badgeText: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-500/30',
    progressBg: 'bg-rose-500',
    glow: 'shadow-rose-500/10',
  },
  warning: {
    badgeBg: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
    badgeText: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-500/30',
    progressBg: 'bg-amber-500',
    glow: 'shadow-amber-500/10',
  },
  info: {
    badgeBg: 'bg-primary/15 text-primary',
    badgeText: 'text-primary',
    border: 'border-primary/30',
    progressBg: 'bg-primary',
    glow: 'shadow-primary/10',
  },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  const style = STYLES[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden w-84 sm:w-96 p-4 rounded-2xl bg-surface/95 backdrop-blur-xl border ${style.border} shadow-xl ${style.glow} flex items-start gap-3 pointer-events-auto transition-all`}
    >
      {/* Icon Pill */}
      <div className={`p-2 rounded-xl ${style.badgeBg} shrink-0 mt-0.5`}>
        <Icon className="w-5 h-5" />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-2">
        <h4 className="text-xs font-bold text-foreground tracking-tight leading-snug">
          {toast.title}
        </h4>
        {toast.message && (
          <p className="text-[11px] text-muted font-medium mt-0.5 leading-relaxed break-words">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close Button */}
      <button
        onClick={onDismiss}
        title="Dismiss notification"
        className="p-1 rounded-lg text-muted hover:text-foreground hover:bg-surface-subtle transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar (if timed) */}
      {toast.duration && toast.duration > 0 ? (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-0.5 ${style.progressBg} opacity-60`}
        />
      ) : null}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2.5 pointer-events-none no-print max-w-[calc(100vw-32px)]">
      <AnimatePresence mode="popLayout">
        {toasts.map((item) => (
          <ToastCard
            key={item.id}
            toast={item}
            onDismiss={() => removeToast(item.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}
