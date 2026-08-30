'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTimetableStore } from '@/lib/store';
import { Database, RefreshCw } from 'lucide-react';

export function LoadingBar() {
  const isFetching = useTimetableStore((s) => s.isFetching);
  const activeOperation = useTimetableStore((s) => s.activeOperation);

  return (
    <AnimatePresence>
      {isFetching && (
        <>
          {/* Top Line Animated Progress */}
          <motion.div
            initial={{ opacity: 0, scaleX: 0 }}
            animate={{ opacity: 1, scaleX: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed top-0 left-0 right-0 z-50 h-[3px] bg-gradient-to-r from-primary via-highlight to-accent shadow-xs origin-left pointer-events-none"
          >
            <div className="w-full h-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          </motion.div>

          {/* Floating Data Loading Pill */}
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-4 left-4 z-40 no-print pointer-events-none"
          >
            <div className="px-3.5 py-2 rounded-2xl bg-surface/95 backdrop-blur-xl border border-primary/25 shadow-xl shadow-primary/10 flex items-center gap-2.5 text-xs font-semibold text-foreground">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
              </span>
              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
              <span>{activeOperation || 'Loading timetable data...'}</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
