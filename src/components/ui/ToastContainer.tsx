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

const STYLES: Record<ToastType, { bg: string; progressBg: string }> = {
  success: { bg: 'bg-emerald-500', progressBg: 'bg-emerald-300' },
  error: { bg: 'bg-rose-500', progressBg: 'bg-rose-300' },
  warning: { bg: 'bg-amber-500', progressBg: 'bg-amber-200' },
  info: { bg: 'bg-blue-500', progressBg: 'bg-blue-300' },
};

function ToastCard({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const Icon = ICONS[toast.type];
  const style = STYLES[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -12, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, y: -8, transition: { duration: 0.2 } }}
      transition={{ type: 'spring', stiffness: 340, damping: 28 }}
      className={`relative overflow-hidden max-w-xs w-full px-3.5 py-2.5 rounded-xl ${style.bg} text-white shadow-lg flex items-center gap-2.5 pointer-events-auto`}
    >
      <Icon className="w-4 h-4 shrink-0" />

      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold leading-snug truncate">{toast.title}</p>
        {toast.message && (
          <p className="text-[11px] text-white/85 leading-snug truncate">{toast.message}</p>
        )}
      </div>

      <button
        onClick={onDismiss}
        title="Dismiss notification"
        className="p-0.5 rounded-md text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 cursor-pointer"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {toast.duration && toast.duration > 0 ? (
        <motion.div
          initial={{ width: '100%' }}
          animate={{ width: '0%' }}
          transition={{ duration: toast.duration / 1000, ease: 'linear' }}
          className={`absolute bottom-0 left-0 h-0.5 ${style.progressBg}`}
        />
      ) : null}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed inset-x-0 top-4 z-50 flex flex-col items-center gap-2 pointer-events-none px-4">
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