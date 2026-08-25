'use client';

import React from 'react';
import { DataManagementStudio } from '@/components/data/DataManagementStudio';
import { Database, Server } from 'lucide-react';

export default function DataPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-foreground tracking-tight">
              Master Entity Management
            </h1>
            <span className="text-xs font-bold font-mono px-2 py-0.5 rounded-lg bg-highlight-light text-highlight border border-highlight/30">
              CRUD Control Center
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure Classes, Labs, Rooms, Faculty profiles, and Subjects. Any updates dynamically
            re-calculate availability and schedule allocations.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted font-medium bg-surface px-3 py-1.5 rounded-xl border border-border shrink-0">
          <Server className="w-4 h-4 text-primary" />
          <span>Local Engine & JSON Sync</span>
        </div>
      </div>

      {/* Main Data Studio */}
      <DataManagementStudio />
    </div>
  );
}
