'use client';

import React from 'react';
import { TargetSelector } from '@/components/schedule/TargetSelector';
import { ScheduleGrid } from '@/components/schedule/ScheduleGrid';
import { SlotDrawer } from '@/components/schedule/SlotDrawer';
import { Calendar, HelpCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { INSTITUTION_INFO } from '@/lib/constants';

export default function SchedulePage() {
  return (
    <div className="space-y-2">
      {/* Page Title & Guidelines */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Visual Timetable Scheduler
            </h1>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-primary-light text-primary border border-primary/20">
              8 × 6 Matrix
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Click any open dashed cell to assign a slot. Real-time conflict engine ensures zero
            double-bookings and respects faculty weekly hour quotas.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-medium bg-surface px-3 py-1.5 rounded-xl border border-border shrink-0">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Auto Conflict Engine Active</span>
        </div>
      </div>

      {/* Target Category & Selector */}
      <TargetSelector />

      {/* 8x6 Timetable Grid */}
      <ScheduleGrid />

      {/* Slide-over Slot Assignment Drawer */}
      <SlotDrawer />

      {/* Tips / Legend */}
      <div className="bg-surface border border-border rounded-2xl p-4 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="font-bold text-foreground">Color Legend:</span>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-primary" />
            <span>1-Hour Lecture</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-highlight" />
            <span>2-Hour Lab Block (Contiguous)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded border border-dashed border-accent" />
            <span>Open Available Slot</span>
          </div>
        </div>

        <div className="text-[11px] text-muted">
          All changes are automatically synced and persisted locally.
        </div>
      </div>
    </div>
  );
}
