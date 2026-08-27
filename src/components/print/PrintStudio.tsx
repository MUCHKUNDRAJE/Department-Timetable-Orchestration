'use client';

import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Printer,
  Download,
  Users,
  FlaskConical,
  DoorOpen,
  UserCheck,
  Layers,
  Sparkles,
  Archive,
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { PrintMode } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PrintPreviewSheet } from './PrintPreviewSheet';
import { exportElementToPdf, exportMultipleElementsToPdf, printElementDirectly } from '@/lib/pdf-export';
import { cn } from '@/lib/utils';

export function PrintStudio() {
  const [activeMode, setActiveMode] = useState<PrintMode>('ug');
  const [isExporting, setIsExporting] = useState(false);
  const [isBulkExporting, setIsBulkExporting] = useState(false);

  const classes = useTimetableStore((s) => s.classes);
  const labs = useTimetableStore((s) => s.labs);
  const rooms = useTimetableStore((s) => s.rooms);
  const faculty = useTimetableStore((s) => s.faculty);
  const subjects = useTimetableStore((s) => s.subjects);
  const assignments = useTimetableStore((s) => s.assignments);

  const [selectedTargetId, setSelectedTargetId] = useState<string>(classes[0]?.id || '');
  const printSheetRef = useRef<HTMLDivElement>(null);
  const bulkContainerRef = useRef<HTMLDivElement>(null);

  // Sync default target ID when tab changes
  const handleModeChange = (mode: PrintMode) => {
    setActiveMode(mode);
    if (mode === 'ug') setSelectedTargetId(classes[0]?.id || '');
    if (mode === 'lab') setSelectedTargetId(labs[0]?.id || '');
    if (mode === 'room') setSelectedTargetId(rooms[0]?.id || '');
    if (mode === 'faculty') setSelectedTargetId(faculty[0]?.id || '');
  };

  const getTargetList = () => {
    if (activeMode === 'ug') return classes;
    if (activeMode === 'lab') return labs;
    if (activeMode === 'room') return rooms;
    return faculty;
  };

  const currentList = getTargetList();
  const currentEntity = currentList.find((i) => i.id === selectedTargetId) || currentList[0];

  // Single PDF Export Handler
  const handleExportSinglePdf = async () => {
    if (!printSheetRef.current) return;
    setIsExporting(true);
    const filename = `${activeMode.toUpperCase()}_Timetable_${currentEntity?.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    await exportElementToPdf(printSheetRef.current, filename, 'landscape');
    setIsExporting(false);
  };

  // Browser Direct Print Dialog with isolated print engine
  const handleBrowserPrint = () => {
    if (printSheetRef.current) {
      printElementDirectly(printSheetRef.current);
    } else {
      window.print();
    }
  };

  // Bulk PDF Export: Generates multi-page PDF of all items in current category
  const handleBulkExport = async () => {
    if (!bulkContainerRef.current) return;
    setIsBulkExporting(true);

    const sheetElements = Array.from(
      bulkContainerRef.current.querySelectorAll('.bulk-print-sheet')
    ) as HTMLElement[];

    const elementsToExport = sheetElements.map((el, idx) => ({
      element: el,
      title: currentList[idx]?.name || `Schedule ${idx + 1}`,
    }));

    const filename = `ALL_${activeMode.toUpperCase()}_TIMETABLES_DEPARTMENT`;
    await exportMultipleElementsToPdf(elementsToExport, filename, 'landscape');
    setIsBulkExporting(false);
  };

  const tabs = [
    { id: 'ug' as PrintMode, label: 'UG Timetable (Class)', icon: Users },
    { id: 'lab' as PrintMode, label: 'Laboratories', icon: FlaskConical },
    { id: 'room' as PrintMode, label: 'Classrooms / Halls', icon: DoorOpen },
    { id: 'faculty' as PrintMode, label: 'Faculty (Personal)', icon: UserCheck },
  ];

  return (
    <div className="space-y-6">
      {/* Mode Tabs Navigation */}
      <div className="bg-surface border border-border rounded-2xl p-2 shadow-subtle no-print">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeMode === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleModeChange(tab.id)}
                className={cn(
                  'flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-xs font-bold transition-all relative',
                  isActive
                    ? 'text-primary bg-primary-light shadow-xs border border-primary/20'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted')} />
                <span>{tab.label}</span>
                {isActive && (
                  <motion.div
                    layoutId="printTabPill"
                    className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Target Selector & Action Bar */}
      <div className="bg-surface border border-border rounded-2xl p-4 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4 no-print">
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Layers className="w-4 h-4 text-muted shrink-0" />
          <div className="w-full md:w-72">
            <Select
              value={selectedTargetId}
              onValueChange={(val) => setSelectedTargetId(val)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select target entity" />
              </SelectTrigger>
              <SelectContent>
                {currentList.map((item) => (
                  <SelectItem key={item.id} value={item.id}>
                    {item.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-xs text-muted font-medium hidden sm:inline">
            ({currentList.length} total available)
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto justify-end">
          <Button
            variant="outline"
            size="md"
            onClick={handleBrowserPrint}
            className="gap-2 text-xs font-bold"
          >
            <Printer className="w-4 h-4 text-muted" />
            Print Timetable
          </Button>

          <Button
            variant="secondary"
            size="md"
            onClick={handleExportSinglePdf}
            isLoading={isExporting}
            className="gap-2 text-xs font-bold"
          >
            <Download className="w-4 h-4 text-primary" />
            Export to PDF
          </Button>

          <Button
            variant="primary"
            size="md"
            onClick={handleBulkExport}
            isLoading={isBulkExporting}
            className="gap-2 text-xs font-bold"
          >
            <Archive className="w-4 h-4" />
            Save All ({currentList.length} Multi-Page PDF)
          </Button>
        </div>
      </div>

      {/* Main Single Document Live Preview Container */}
      <div className="printable-area overflow-x-auto">
        <PrintPreviewSheet
          ref={printSheetRef}
          mode={activeMode}
          targetId={selectedTargetId}
          classes={classes}
          labs={labs}
          rooms={rooms}
          facultyList={faculty}
          subjects={subjects}
          assignments={assignments}
        />
      </div>

      {/* Hidden container for generating all sheets during Bulk Export */}
      <div
        ref={bulkContainerRef}
        style={{ position: 'absolute', top: -99999, left: -99999, width: '1200px' }}
      >
        {currentList.map((item) => (
          <div key={item.id} className="bulk-print-sheet mb-8">
            <PrintPreviewSheet
              mode={activeMode}
              targetId={item.id}
              classes={classes}
              labs={labs}
              rooms={rooms}
              facultyList={faculty}
              subjects={subjects}
              assignments={assignments}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
