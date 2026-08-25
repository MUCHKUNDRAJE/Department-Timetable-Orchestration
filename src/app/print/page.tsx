'use client';

import React from 'react';
import { PrintStudio } from '@/components/print/PrintStudio';
import { Printer, FileText } from 'lucide-react';

export default function PrintPage() {
  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 no-print">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Publishing & Export Studio
            </h1>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-accent-light text-primary border border-accent/30">
              Print-Ready
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Export official institutional timetables for Classes, Labs, Rooms, or Faculty. Supports
            single PDF export and one-click bulk generation.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-medium bg-surface px-3 py-1.5 rounded-xl border border-border shrink-0">
          <FileText className="w-4 h-4 text-primary" />
          <span>A4 Landscape Certified Format</span>
        </div>
      </div>

      {/* Main Print Studio */}
      <PrintStudio />
    </div>
  );
}
