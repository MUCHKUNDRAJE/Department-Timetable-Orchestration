'use client';

import React, { useState, useRef, useEffect } from 'react';
import * as XLSX from 'xlsx';

import { motion } from 'framer-motion';
import {
  Users,
  FlaskConical,
  DoorOpen,
  UserCheck,
  BookOpen,
  Plus,
  Search,
  Edit2,
  Trash2,
  Download,
  Upload,
  RotateCcw,
  Sparkles,
  Check,
  AlertTriangle,
  CalendarDays,
  Lock,
  Eye,
  EyeOff,
  FileSpreadsheet,
} from 'lucide-react';

import { useTimetableStore } from '@/lib/store';
import { CollegeClass, ClassBatch, Lab, Room, Faculty, Subject } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { toast } from '@/lib/toast';
import { calculateFacultyAllocatedHours } from '@/lib/conflict-checker';
import { cn, getFacultyInitials, getSubjectInitials } from '@/lib/utils';

type EntityTab = 'classes' | 'labs' | 'rooms' | 'faculty' | 'subjects';

export function DataManagementStudio() {
  const [activeTab, setActiveTab] = useState<EntityTab>('classes');
  const [searchQuery, setSearchQuery] = useState('');

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Delete Confirm Modal State
  const [deleteCandidate, setDeleteCandidate] = useState<{
    id: string;
    name: string;
    type: EntityTab;
  } | null>(null);

  // Store data & actions
  const classes = useTimetableStore((s) => s.classes);
  const labs = useTimetableStore((s) => s.labs);
  const rooms = useTimetableStore((s) => s.rooms);
  const faculty = useTimetableStore((s) => s.faculty);
  const subjects = useTimetableStore((s) => s.subjects);
  const assignments = useTimetableStore((s) => s.assignments);
  const academicSession = useTimetableStore((s) => s.academicSession);
  const setAcademicSession = useTimetableStore((s) => s.setAcademicSession);

  // Local Session configuration state
  const [sessionInput, setSessionInput] = useState(academicSession || '2026 - 2027 (Even Semester)');
  const [isSessionApplied, setIsSessionApplied] = useState(false);

  // Password-Protected Reset Modal State
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetting, setIsResetting] = useState(false);

  const addClass = useTimetableStore((s) => s.addClass);
  const updateClass = useTimetableStore((s) => s.updateClass);
  const deleteClass = useTimetableStore((s) => s.deleteClass);

  const addLab = useTimetableStore((s) => s.addLab);
  const updateLab = useTimetableStore((s) => s.updateLab);
  const deleteLab = useTimetableStore((s) => s.deleteLab);

  const addRoom = useTimetableStore((s) => s.addRoom);
  const updateRoom = useTimetableStore((s) => s.updateRoom);
  const deleteRoom = useTimetableStore((s) => s.deleteRoom);

  const addFaculty = useTimetableStore((s) => s.addFaculty);
  const updateFaculty = useTimetableStore((s) => s.updateFaculty);
  const deleteFaculty = useTimetableStore((s) => s.deleteFaculty);

  const addSubject = useTimetableStore((s) => s.addSubject);
  const updateSubject = useTimetableStore((s) => s.updateSubject);
  const deleteSubject = useTimetableStore((s) => s.deleteSubject);

  const importFullState = useTimetableStore((s) => s.importFullState);
  const resetToSeedData = useTimetableStore((s) => s.resetToSeedData);
  const exportFullState = useTimetableStore((s) => s.exportFullState);

  // Async UI state
  const [isSaving, setIsSaving] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isImportingExcel, setIsImportingExcel] = useState(false);
  const subjectExcelImportRef = useRef<HTMLInputElement>(null);


  // Searchable form field states (Class Teacher combobox + Subjects search bar)
  const [facultySearchQuery, setFacultySearchQuery] = useState('');
  const [classTcherDropdownOpen, setClassTcherDropdownOpen] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('');
  const classTcherRef = useRef<HTMLDivElement>(null);

  // Click-outside handler: close Class Teacher combobox dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (classTcherRef.current && !classTcherRef.current.contains(e.target as Node)) {
        setClassTcherDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const [formData, setFormData] = useState<any>({});

  const handleApplySession = (sessionToApply: string) => {
    const cleanSession = sessionToApply.trim();
    if (!cleanSession) {
      toast.warning('Invalid Session', 'Please enter a valid academic session name.');
      return;
    }
    setSessionInput(cleanSession);
    setAcademicSession(cleanSession);
    setIsSessionApplied(true);
    setTimeout(() => setIsSessionApplied(false), 2000);
    toast.success(
      'Academic Session Updated',
      `Applied "${cleanSession}" to all timetable headers, views, and exports.`
    );
  };

  const handleExecuteProtectedReset = async (e: React.FormEvent) => {
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

  const handleOpenCreate = () => {
    setEditingItem(null);
    if (activeTab === 'classes') {
      setFormData({
        name: '',
        department: 'Artificial Intelligence & Data Science',
        semester: 7,
        section: 'A',
        studentCount: 64,
        classTeacherId: '',
        batches: [
          { name: 'A1', fromRollNo: 1, toRollNo: 16 },
          { name: 'A2', fromRollNo: 17, toRollNo: 32 },
          { name: 'A3', fromRollNo: 33, toRollNo: 48 },
          { name: 'A4', fromRollNo: 49, toRollNo: 64 },
        ],
      });
    } else if (activeTab === 'labs') {
      setFormData({
        name: '',
        capacity: 36,
        department: 'Artificial Intelligence & Data Science',
        location: 'Engineering Wing',
      });
    } else if (activeTab === 'rooms') {
      setFormData({
        name: '',
        capacity: 70,
        building: 'Engineering Block 3rd Floor',
        type: 'lecture',
      });
    } else if (activeTab === 'faculty') {
      setFormData({
        name: '',
        nickname: '',
        department: 'Artificial Intelligence & Data Science',
        designation: 'Assistant Professor',
        roles: [],
        email: '',
        maxWeeklyHours: 20,
        subjectIds: [],
      });
    } else if (activeTab === 'subjects') {
      setFormData({
        name: '',
        code: '',
        abbreviation: '',
        type: 'lecture',
        credits: 3,
        color: '#5755FE',
        department: 'AIDS',
        semester: 7,
      });
    }
    setFacultySearchQuery('');
    setSubjectSearchQuery('');
    setClassTcherDropdownOpen(false);
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    if (activeTab === 'classes') {
      const sec = item.section || 'A';
      const defaultBatches = [
        { name: `${sec}1`, fromRollNo: 1, toRollNo: 16 },
        { name: `${sec}2`, fromRollNo: 17, toRollNo: 32 },
        { name: `${sec}3`, fromRollNo: 33, toRollNo: 48 },
        { name: `${sec}4`, fromRollNo: 49, toRollNo: 64 },
      ];
      setFormData({
        ...item,
        batches: (item.batches && item.batches.length > 0) ? item.batches : defaultBatches,
      });
    } else {
      setFormData({ ...item });
    }
    setFacultySearchQuery('');
    setSubjectSearchQuery('');
    setClassTcherDropdownOpen(false);
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setApiError(null);
    const itemName = formData.name || formData.code || 'Record';
    if (activeTab === 'classes') {
      const batches = formData.batches || [];
      if (batches.length !== 4) {
        toast.error('Validation Error', 'Each class must have exactly 4 batches configured (e.g. A1, A2, A3, A4).');
        setIsSaving(false);
        return;
      }
      for (const b of batches) {
        if (!b.name || !b.name.trim()) {
          toast.error('Validation Error', 'All 4 batches must have a valid batch name.');
          setIsSaving(false);
          return;
        }
        if (Number(b.fromRollNo) > Number(b.toRollNo)) {
          toast.error('Validation Error', `Batch ${b.name}: 'From Roll No' cannot be greater than 'To Roll No'.`);
          setIsSaving(false);
          return;
        }
      }
    }
    try {
      if (editingItem) {
        if (activeTab === 'classes') await updateClass(editingItem.id, formData);
        if (activeTab === 'labs') await updateLab(editingItem.id, formData);
        if (activeTab === 'rooms') await updateRoom(editingItem.id, formData);
        if (activeTab === 'faculty') await updateFaculty(editingItem.id, formData);
        if (activeTab === 'subjects') await updateSubject(editingItem.id, formData);
        toast.success('Record Updated', `${itemName} has been updated in database.`);
      } else {
        if (activeTab === 'classes') await addClass(formData);
        if (activeTab === 'labs') await addLab(formData);
        if (activeTab === 'rooms') await addRoom(formData);
        if (activeTab === 'faculty') await addFaculty(formData);
        if (activeTab === 'subjects') await addSubject(formData);
        toast.success('Record Created', `${itemName} has been added to database.`);
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      const msg = err.message || 'Failed to save. Is the backend running?';
      setApiError(msg);
      toast.error('Save Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    const { id, type, name } = deleteCandidate;
    setIsSaving(true);
    setApiError(null);
    try {
      if (type === 'classes') await deleteClass(id);
      if (type === 'labs') await deleteLab(id);
      if (type === 'rooms') await deleteRoom(id);
      if (type === 'faculty') await deleteFaculty(id);
      if (type === 'subjects') await deleteSubject(id);
      toast.info('Record Deleted', `${name} was removed from the database.`);
      setDeleteCandidate(null);
    } catch (err: any) {
      const msg = err.message || 'Failed to delete. Is the backend running?';
      setApiError(msg);
      toast.error('Delete Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  // JSON Export — calls GET /api/data/export
  const handleExportBackup = async () => {
    try {
      const backup = await exportFullState();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Timetable_System_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Backup Exported', 'Full institutional timetable JSON downloaded.');
    } catch (err: any) {
      const msg = err.message || 'Export failed. Is the backend running?';
      setApiError(msg);
      toast.error('Export Failed', msg);
    }
  };

  // JSON Import — calls POST /api/data/import
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.classes && parsed.faculty && parsed.assignments) {
          await importFullState(parsed);
          toast.success('Database Imported', 'Successfully imported institutional classes, rooms, faculty, and schedule.');
        } else {
          toast.warning('Invalid Format', 'JSON schema does not match required timetable structure.');
        }
      } catch (err: any) {
        const msg = err.message || 'Import failed. Check the file format and backend.';
        setApiError(msg);
        toast.error('Import Failed', msg);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  /**
   * Excel Import for Subjects — parses YCCE Scheme of Examination format.
   * Columns expected: SN | Sub. Code | Subject | T/P | Hrs | Credit
   * Semester is inferred from merged header rows like "THIRD SEMESTER", "FIFTH SEMESTER", etc.
   */
  const handleImportSubjectsFromExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setIsImportingExcel(true);

    const semesterWordMap: Record<string, number> = {
      first: 1, second: 2, third: 3, fourth: 4,
      fifth: 5, sixth: 6, seventh: 7, eighth: 8,
    };

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

      let currentSemester = 7; // fallback
      let importedCount = 0;
      let skippedCount = 0;
      const existingCodes = new Set(subjects.map((s) => s.code.toLowerCase().trim()));

      // Detect department from the sheet header rows (first 5 rows)
      let detectedDept = 'AIDS';
      for (let i = 0; i < Math.min(5, rows.length); i++) {
        const rowStr = rows[i].join(' ').toLowerCase();
        if (rowStr.includes('computer technology') || rowStr.includes('iot')) detectedDept = 'CT';
        else if (rowStr.includes('artificial intelligence') || rowStr.includes('aids') || rowStr.includes('ai & ds')) detectedDept = 'AIDS';
        else if (rowStr.includes('electronics') || rowStr.includes('entc')) detectedDept = 'ENTC';
        else if (rowStr.includes('mechanical')) detectedDept = 'MECH';
        else if (rowStr.includes('civil')) detectedDept = 'CIVIL';
      }

      for (const row of rows) {
        const cellValues = row.map((c: any) => String(c ?? '').trim());
        const fullRow = cellValues.join(' ').toLowerCase();

        // Detect semester header rows (e.g. "THIRD SEMESTER", "FIFTH SEMESTER")
        const semMatch = fullRow.match(
          /(first|second|third|fourth|fifth|sixth|seventh|eighth)\s+semester/i
        );
        if (semMatch) {
          const word = semMatch[1].toLowerCase();
          currentSemester = semesterWordMap[word] ?? currentSemester;
          continue;
        }

        // Try to extract subject code (e.g. 23IOT1501, 23ADS1234)
        // Columns order: SN | Sub. Code | Subject | T/P | Hrs | Credit
        // The Sub. Code cell looks like: 23IOT1501 / 23ADS1234
        let subCode = '';
        let subName = '';
        let typeChar = 'T'; // T = lecture, P = lab
        let credit = 3;

        // Find which column has the subject code (a cell matching alphanumeric code pattern)
        for (let ci = 0; ci < cellValues.length; ci++) {
          const val = cellValues[ci];
          if (/^\d{2}[A-Z]{2,5}\d{4}$/.test(val) || /^[A-Z]{2,6}\d{4,}$/.test(val) || /^MDM\w+/.test(val)) {
            subCode = val;
            // Subject name is the next non-empty cell
            for (let ni = ci + 1; ni < cellValues.length; ni++) {
              if (cellValues[ni] && !/^[TtPp]$/.test(cellValues[ni]) && isNaN(Number(cellValues[ni]))) {
                subName = cellValues[ni];
                break;
              }
            }
            // T/P column: find the first T or P after the code
            for (let ni = ci + 1; ni < cellValues.length; ni++) {
              if (/^[TtPp]$/.test(cellValues[ni])) {
                typeChar = cellValues[ni].toUpperCase();
                break;
              }
            }
            // Credit: last numeric cell in the row (usually the rightmost)
            for (let ni = cellValues.length - 1; ni > ci; ni--) {
              const num = parseInt(cellValues[ni]);
              if (!isNaN(num) && num >= 1 && num <= 4) {
                credit = num;
                break;
              }
            }
            break;
          }
        }

        if (!subCode || !subName) continue;
        if (existingCodes.has(subCode.toLowerCase())) {
          skippedCount++;
          continue;
        }

        const subjectType = typeChar === 'P' ? 'lab' : 'lecture';

        // Generate abbreviation: uppercase initials of meaningful words
        const abbr = subName
          .replace(/\b(of|and|the|in|a|for|to|&)\b/gi, '')
          .split(/\s+/)
          .filter(Boolean)
          .map((w: string) => w[0].toUpperCase())
          .join('')
          .slice(0, 6);

        await addSubject({
          name: subName,
          code: subCode,
          abbreviation: abbr,
          type: subjectType,
          credits: credit,
          color: '#5755FE',
          department: detectedDept,
          semester: currentSemester,
        });

        existingCodes.add(subCode.toLowerCase());
        importedCount++;
      }

      if (importedCount > 0) {
        toast.success(
          'Subjects Imported',
          `${importedCount} subjects imported successfully.${skippedCount > 0 ? ` ${skippedCount} skipped (duplicates).` : ''}`
        );
      } else if (skippedCount > 0) {
        toast.warning('Nothing New', `All ${skippedCount} subjects already exist in the database.`);
      } else {
        toast.warning('No Data Found', 'Could not detect any valid subject rows. Check the Excel format (Sub. Code + Subject columns required).');
      }
    } catch (err: any) {
      const msg = err.message || 'Failed to parse Excel file.';
      setApiError(msg);
      toast.error('Excel Import Failed', msg);
    } finally {
      setIsImportingExcel(false);
    }
  };


  const tabs = [
    { id: 'classes' as EntityTab, label: 'Classes', count: classes.length, icon: Users },
    { id: 'labs' as EntityTab, label: 'Labs', count: labs.length, icon: FlaskConical },
    { id: 'rooms' as EntityTab, label: 'Rooms / Halls', count: rooms.length, icon: DoorOpen },
    { id: 'faculty' as EntityTab, label: 'Faculty', count: faculty.length, icon: UserCheck },
    { id: 'subjects' as EntityTab, label: 'Subjects', count: subjects.length, icon: BookOpen },
  ];

  return (
    <div className="space-y-6">
      {/* API Error Banner */}
      {apiError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{apiError}</span>
          <button
            onClick={() => setApiError(null)}
            className="ml-auto text-rose-500 hover:text-rose-700 font-bold text-lg leading-none"
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Academic Session Management Banner */}
      <div className="bg-surface border border-border rounded-2xl p-4 sm:p-5 shadow-subtle flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <CalendarDays className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground">Academic Session Orchestrator</h3>
              <Badge variant="primary" className="text-[10px]">
                Global Term
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Updating this session immediately applies across all timetable headers, views, and exports.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full md:w-auto">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              '2026 - 2027 (Even Semester)',
              '2026 - 2027 (Odd Semester)',
              '2025 - 2026 (Even Semester)',
            ].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleApplySession(preset)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  academicSession === preset
                    ? 'bg-primary text-white border-primary shadow-xs'
                    : 'bg-surface-subtle text-muted hover:text-foreground border-border hover:border-border-strong'
                }`}
              >
                {preset.replace(' Semester', '')}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5">
            <input
              type="text"
              value={sessionInput}
              onChange={(e) => setSessionInput(e.target.value)}
              placeholder="Custom session (e.g. 2026-2027 Even)"
              className="px-3 py-1.5 text-xs rounded-lg border border-border bg-surface text-foreground font-mono focus:outline-none focus:border-primary w-48"
            />
            <Button
              type="button"
              variant={isSessionApplied ? 'secondary' : 'outline'}
              size="sm"
              onClick={() => handleApplySession(sessionInput)}
              className="text-xs font-bold gap-1 shrink-0"
            >
              {isSessionApplied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : null}
              {isSessionApplied ? 'Applied' : 'Apply'}
            </Button>
          </div>
        </div>
      </div>

      {/* Top Toolbar: Tabs, Search & Backup */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        {/* Navigation Tabs */}
        <div className="bg-surface border border-border p-1 rounded-2xl shadow-subtle flex flex-wrap gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSearchQuery('');
                }}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all relative',
                  isActive
                    ? 'bg-primary-light text-primary shadow-xs border border-primary/20'
                    : 'text-muted hover:text-foreground hover:bg-surface-hover'
                )}
              >
                <Icon className={cn('w-4 h-4', isActive ? 'text-primary' : 'text-muted')} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'text-[10px] px-1.5 py-0.2 rounded-full font-mono',
                    isActive ? 'bg-primary text-white' : 'bg-surface-subtle text-muted'
                  )}
                >
                  {tab.count}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="dataTabPill"
                    className="absolute inset-0 border-2 border-primary rounded-xl pointer-events-none"
                    transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Global Action Tools */}
        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setResetPassword('');
              setResetError(null);
              setIsResetModalOpen(true);
            }}
            title="Reset Database with Password Protection"
            className="gap-1.5 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportBackup}
            title="Download JSON Backup"
            className="gap-1.5 text-xs font-medium"
          >
            <Download className="w-3.5 h-3.5" />
            Backup JSON
          </Button>

          <label className="cursor-pointer">
            <input
              type="file"
              accept=".json"
              onChange={handleImportBackup}
              className="hidden"
            />
            <span className="inline-flex items-center justify-center font-medium transition-all duration-150 border border-border bg-surface text-foreground hover:bg-surface-hover hover:border-border-strong text-xs px-2.5 py-1.5 rounded-lg gap-1.5 shadow-xs select-none">
              <Upload className="w-3.5 h-3.5" />
              Restore
            </span>
          </label>

          {/* Excel Import for Subjects — only shown on Subjects tab */}
          {activeTab === 'subjects' && (
            <label className="cursor-pointer" title="Import subjects from YCCE Scheme of Examination Excel file">
              <input
                ref={subjectExcelImportRef}
                type="file"
                accept=".xlsx,.xls,.ods"
                onChange={handleImportSubjectsFromExcel}
                className="hidden"
              />
              <span
                className={`inline-flex items-center justify-center font-medium transition-all duration-150 border text-xs px-2.5 py-1.5 rounded-lg gap-1.5 shadow-xs select-none ${
                  isImportingExcel
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 cursor-wait'
                    : 'border-emerald-400 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:border-emerald-500'
                }`}
              >
                {isImportingExcel ? (
                  <><span className="animate-spin text-xs">⏳</span> Importing...</>
                ) : (
                  <><FileSpreadsheet className="w-3.5 h-3.5" /> Import Excel</>
                )}
              </span>
            </label>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleOpenCreate}
            className="gap-1.5 text-xs font-bold"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab.slice(0, -1).toUpperCase()}
          </Button>
        </div>
      </div>


      {/* Search Input Bar */}
      <div className="bg-surface border border-border rounded-2xl p-3 shadow-subtle flex items-center gap-3">
        <Search className="w-4 h-4 text-muted shrink-0" />
        <input
          type="text"
          placeholder={`Search ${activeTab}...`}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-transparent text-sm font-medium text-foreground placeholder:text-muted focus:outline-none"
        />
      </div>

      {/* Responsive Data Tables */}
      <div className="bg-surface border border-border rounded-2xl shadow-subtle overflow-hidden">
        {/* 1. Classes Table */}
        {activeTab === 'classes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Class Name</th>
                  <th className="p-4">Class Teacher</th>
                  <th className="p-4">Batches & Roll Range</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4">Section</th>
                  <th className="p-4">Students</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {classes
                  .filter((c) => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((c) => {
                    const teacher = faculty.find((f) => f.id === c.classTeacherId);
                    return (
                      <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-4 font-bold text-foreground">{c.name}</td>
                        <td className="p-4">
                          {teacher ? (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                [{getFacultyInitials(teacher)}]
                              </span>
                              <span className="font-semibold text-foreground text-xs">{teacher.name}</span>
                            </div>
                          ) : (
                            <span className="text-muted text-xs italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-[260px]">
                            {((c.batches && c.batches.length > 0)
                              ? c.batches
                              : [
                                  { name: `${c.section || 'A'}1`, fromRollNo: 1, toRollNo: 16 },
                                  { name: `${c.section || 'A'}2`, fromRollNo: 17, toRollNo: 32 },
                                  { name: `${c.section || 'A'}3`, fromRollNo: 33, toRollNo: 48 },
                                  { name: `${c.section || 'A'}4`, fromRollNo: 49, toRollNo: 64 },
                                ]
                            ).map((b, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 font-mono text-[10px] font-bold bg-indigo-50 text-indigo-900 border border-indigo-200 px-1.5 py-0.5 rounded shadow-xs"
                                title={`Batch ${b.name}: Roll ${b.fromRollNo} to ${b.toRollNo}`}
                              >
                                <span className="text-indigo-700 font-extrabold">{b.name}:</span>
                                <span className="text-slate-600 font-medium">{b.fromRollNo}–{b.toRollNo}</span>
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">{c.department}</td>
                        <td className="p-4">
                          <Badge variant="primary" size="sm">
                            Sem {c.semester}
                          </Badge>
                        </td>
                        <td className="p-4 font-mono font-bold text-foreground">{c.section}</td>
                        <td className="p-4 font-mono text-muted">{c.studentCount || 60}</td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(c)}
                              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteCandidate({ id: c.id, name: c.name, type: 'classes' })
                              }
                              className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* 2. Labs Table */}
        {activeTab === 'labs' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Lab Name</th>
                  <th className="p-4">Capacity</th>
                  <th className="p-4">Department</th>
                  <th className="p-4">Location</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {labs
                  .filter((l) => l.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((l) => (
                    <tr key={l.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4 font-bold text-foreground flex items-center gap-2">
                        <FlaskConical className="w-4 h-4 text-highlight shrink-0" />
                        {l.name}
                      </td>
                      <td className="p-4">
                        <Badge variant="highlight" size="sm">
                          {l.capacity} Systems
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{l.department}</td>
                      <td className="p-4 text-xs font-mono text-muted">{l.location || 'Wing A'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(l)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteCandidate({ id: l.id, name: l.name, type: 'labs' })
                            }
                            className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 3. Rooms Table */}
        {activeTab === 'rooms' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Room Name</th>
                  <th className="p-4">Seating Capacity</th>
                  <th className="p-4">Building / Floor</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rooms
                  .filter((r) => r.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((r) => (
                    <tr key={r.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4 font-bold text-foreground font-mono">{r.name}</td>
                      <td className="p-4">
                        <Badge variant="primary" size="sm">
                          {r.capacity} Seats
                        </Badge>
                      </td>
                      <td className="p-4 text-muted-foreground">{r.building}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(r)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteCandidate({ id: r.id, name: r.name, type: 'rooms' })
                            }
                            className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 4. Faculty Table */}
        {activeTab === 'faculty' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Faculty Name</th>
                  <th className="p-4">Designation & Roles</th>
                  <th className="p-4">Weekly Load</th>
                  <th className="p-4">Assigned Subjects</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {faculty
                  .filter((f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((f) => {
                    const hours = calculateFacultyAllocatedHours(f.id, assignments);
                    const facultySubjects = subjects.filter((s) => f.subjectIds.includes(s.id));
                    const isHod = f.roles?.includes('Head of Department (HOD)');
                    const isIncharge = f.roles?.includes('Timetable Incharge');
                    return (
                      <tr key={f.id} className="hover:bg-surface-hover transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black px-2 py-0.5 rounded-lg bg-primary/10 text-primary border border-primary/20 shrink-0">
                              {getFacultyInitials(f)}
                            </span>
                            <div>
                              <div className="font-bold text-foreground">{f.name}</div>
                              <div className="text-[11px] text-muted font-mono">{f.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-xs font-medium text-foreground">{f.designation}</span>
                            <div className="flex items-center gap-1 flex-wrap">
                              {isHod && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200">
                                  HOD
                                </span>
                              )}
                              {isIncharge && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                                  Timetable Incharge
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge
                            variant={hours >= f.maxWeeklyHours ? 'warning' : 'success'}
                            size="sm"
                          >
                            {hours} / {f.maxWeeklyHours} hrs
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {facultySubjects.map((s) => (
                              <span
                                key={s.id}
                                className="text-[10px] font-mono font-bold bg-surface-subtle px-1.5 py-0.5 rounded border border-border"
                                title={s.name}
                              >
                                {s.abbreviation || s.code}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleOpenEdit(f)}
                              className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() =>
                                setDeleteCandidate({ id: f.id, name: f.name, type: 'faculty' })
                              }
                              className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}

        {/* 5. Subjects Table */}
        {activeTab === 'subjects' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-subtle border-b border-border text-xs font-bold text-muted-foreground uppercase tracking-wider">
                <tr>
                  <th className="p-4">Abbr</th>
                  <th className="p-4">Code</th>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4 text-center">Credits</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects
                  .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()) || (s.abbreviation && s.abbreviation.toLowerCase().includes(searchQuery.toLowerCase())))
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-black text-xs bg-indigo-50 text-indigo-900 border border-indigo-200 px-2 py-0.5 rounded">
                          [{s.abbreviation || getSubjectInitials(s)}]
                        </span>
                      </td>
                      <td className="p-4">
                        <span className="font-mono font-semibold text-xs bg-surface-subtle text-foreground border border-border px-2 py-0.5 rounded">
                          {s.code}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-foreground">{s.name}</td>
                      <td className="p-4">
                        <Badge variant={s.type === 'lab' ? 'highlight' : 'primary'} size="sm">
                          {s.type.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 text-center">
                        <span className="font-mono font-bold text-xs bg-amber-50 text-amber-900 border border-amber-200 px-2.5 py-0.5 rounded shadow-xs">
                          {s.credits ?? (s.type === 'lab' ? 2 : 3)} Cr
                        </span>
                      </td>
                      <td className="p-4 font-mono text-muted">Sem {s.semester}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(s)}
                            className="p-1.5 rounded-lg text-muted hover:text-primary hover:bg-primary-light transition-colors"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() =>
                              setDeleteCandidate({ id: s.id, name: s.name, type: 'subjects' })
                            }
                            className="p-1.5 rounded-lg text-muted hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Slide-over Drawer for Add/Edit Entity Form */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`${editingItem ? 'Edit' : 'Create New'} ${activeTab.slice(0, -1).toUpperCase()}`}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {/* Class Form */}
          {activeTab === 'classes' && (
            <>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Class Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AIDS 7th Sem A"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Semester
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formData.semester || 7}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: parseInt(e.target.value) })
                    }
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Section
                  </label>
                  <input
                    type="text"
                    value={formData.section ?? ''}
                    onChange={(e) => {
                      const newSec = e.target.value;
                      const secLetter = newSec.trim().toUpperCase() || 'A';
                      const currentBatches = formData.batches || [];
                      const updatedBatches = currentBatches.length === 4
                        ? currentBatches.map((b: any, idx: number) => ({
                            ...b,
                            name: `${secLetter}${idx + 1}`,
                          }))
                        : [
                            { name: `${secLetter}1`, fromRollNo: 1, toRollNo: 16 },
                            { name: `${secLetter}2`, fromRollNo: 17, toRollNo: 32 },
                            { name: `${secLetter}3`, fromRollNo: 33, toRollNo: 48 },
                            { name: `${secLetter}4`, fromRollNo: 49, toRollNo: 64 },
                          ];
                      setFormData({ ...formData, section: newSec, batches: updatedBatches });
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department ?? ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Total Student Count
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.studentCount || 64}
                    onChange={(e) => {
                      const count = parseInt(e.target.value) || 64;
                      setFormData({ ...formData, studentCount: count });
                    }}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>

              {/* Mandatory 4 Practical Batches & Roll Number Allocation */}
              <div className="p-3 bg-surface-subtle border border-border rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <label className="block text-xs font-bold text-foreground uppercase">
                        Mandatory 4 Practical Batches (A1, A2, A3, A4)
                      </label>
                      <span className="text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.5 rounded">
                        4 Batches Required
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Configure roll number range for all 4 practical batches in this section.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const sec = (formData.section || 'A').trim().toUpperCase() || 'A';
                      const count = parseInt(formData.studentCount) || 64;
                      const batchSize = Math.ceil(count / 4);
                      const autoBatches = [
                        { name: `${sec}1`, fromRollNo: 1, toRollNo: batchSize },
                        { name: `${sec}2`, fromRollNo: batchSize + 1, toRollNo: batchSize * 2 },
                        { name: `${sec}3`, fromRollNo: batchSize * 2 + 1, toRollNo: batchSize * 3 },
                        { name: `${sec}4`, fromRollNo: batchSize * 3 + 1, toRollNo: count },
                      ];
                      setFormData({ ...formData, batches: autoBatches });
                      toast.info('Batches Recalculated', `Distributed 1 to ${count} evenly across 4 batches.`);
                    }}
                    className="text-[11px] font-semibold text-primary hover:text-primary-dark bg-primary/10 hover:bg-primary/20 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 shrink-0"
                  >
                    <Sparkles className="w-3 h-3" /> Auto 4 Batches
                  </button>
                </div>

                <div className="space-y-2">
                  {(formData.batches && formData.batches.length === 4
                    ? formData.batches
                    : [
                        { name: `${(formData.section || 'A').toUpperCase()}1`, fromRollNo: 1, toRollNo: 16 },
                        { name: `${(formData.section || 'A').toUpperCase()}2`, fromRollNo: 17, toRollNo: 32 },
                        { name: `${(formData.section || 'A').toUpperCase()}3`, fromRollNo: 33, toRollNo: 48 },
                        { name: `${(formData.section || 'A').toUpperCase()}4`, fromRollNo: 49, toRollNo: 64 },
                      ]
                  ).map((batch: any, index: number) => {
                    const studentNum = Number(batch.toRollNo) - Number(batch.fromRollNo) + 1;
                    return (
                      <div key={index} className="flex items-center gap-2 bg-surface p-2.5 rounded-xl border border-border">
                        <div className="w-24 shrink-0">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                            Batch {index + 1}
                          </label>
                          <input
                            type="text"
                            required
                            value={batch.name || ''}
                            onChange={(e) => {
                              const currentBatches = formData.batches && formData.batches.length === 4
                                ? [...formData.batches]
                                : [
                                    { name: `${(formData.section || 'A').toUpperCase()}1`, fromRollNo: 1, toRollNo: 16 },
                                    { name: `${(formData.section || 'A').toUpperCase()}2`, fromRollNo: 17, toRollNo: 32 },
                                    { name: `${(formData.section || 'A').toUpperCase()}3`, fromRollNo: 33, toRollNo: 48 },
                                    { name: `${(formData.section || 'A').toUpperCase()}4`, fromRollNo: 49, toRollNo: 64 },
                                  ];
                              currentBatches[index] = { ...currentBatches[index], name: e.target.value.toUpperCase() };
                              setFormData({ ...formData, batches: currentBatches });
                            }}
                            placeholder={`e.g. ${(formData.section || 'A').toUpperCase()}${index + 1}`}
                            className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold uppercase text-foreground focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                            From Roll No
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={batch.fromRollNo ?? ''}
                            onChange={(e) => {
                              const currentBatches = formData.batches && formData.batches.length === 4
                                ? [...formData.batches]
                                : [
                                    { name: `${(formData.section || 'A').toUpperCase()}1`, fromRollNo: 1, toRollNo: 16 },
                                    { name: `${(formData.section || 'A').toUpperCase()}2`, fromRollNo: 17, toRollNo: 32 },
                                    { name: `${(formData.section || 'A').toUpperCase()}3`, fromRollNo: 33, toRollNo: 48 },
                                    { name: `${(formData.section || 'A').toUpperCase()}4`, fromRollNo: 49, toRollNo: 64 },
                                  ];
                              currentBatches[index] = { ...currentBatches[index], fromRollNo: parseInt(e.target.value) || 1 };
                              setFormData({ ...formData, batches: currentBatches });
                            }}
                            placeholder="1"
                            className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-bold text-muted-foreground uppercase mb-0.5">
                            To Roll No
                          </label>
                          <input
                            type="number"
                            min={1}
                            required
                            value={batch.toRollNo ?? ''}
                            onChange={(e) => {
                              const currentBatches = formData.batches && formData.batches.length === 4
                                ? [...formData.batches]
                                : [
                                    { name: `${(formData.section || 'A').toUpperCase()}1`, fromRollNo: 1, toRollNo: 16 },
                                    { name: `${(formData.section || 'A').toUpperCase()}2`, fromRollNo: 17, toRollNo: 32 },
                                    { name: `${(formData.section || 'A').toUpperCase()}3`, fromRollNo: 33, toRollNo: 48 },
                                    { name: `${(formData.section || 'A').toUpperCase()}4`, fromRollNo: 49, toRollNo: 64 },
                                  ];
                              currentBatches[index] = { ...currentBatches[index], toRollNo: parseInt(e.target.value) || 1 };
                              setFormData({ ...formData, batches: currentBatches });
                            }}
                            placeholder="16"
                            className="w-full bg-surface-subtle border border-border rounded-lg px-2.5 py-1.5 text-xs font-mono text-foreground focus:ring-1 focus:ring-accent"
                          />
                        </div>
                        <div className="w-24 text-center shrink-0 pt-3.5">
                          <span className="inline-block text-[11px] font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-1 rounded-md">
                            {studentNum > 0 ? `${studentNum} Stds` : '—'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div ref={classTcherRef} className="relative">
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Class Teacher (Faculty Incharge)
                </label>
                {/* Searchable Combobox */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                    <Search className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search faculty by name or initials…"
                    value={facultySearchQuery}
                    onFocus={() => setClassTcherDropdownOpen(true)}
                    onChange={(e) => {
                      setFacultySearchQuery(e.target.value);
                      setClassTcherDropdownOpen(true);
                    }}
                    className="w-full bg-surface border border-border rounded-xl pl-8 pr-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                  {formData.classTeacherId && (
                    <button
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, classTeacherId: undefined });
                        setFacultySearchQuery('');
                      }}
                      className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground text-xs"
                    >
                      ✕
                    </button>
                  )}
                </div>
                {/* Currently selected badge */}
                {formData.classTeacherId && (() => {
                  const sel = faculty.find((f) => f.id === formData.classTeacherId);
                  return sel ? (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1">
                      <span className="font-mono font-black">[{getFacultyInitials(sel)}]</span>
                      <span>{sel.name}</span>
                      <span className="text-muted-foreground">— {sel.designation}</span>
                    </div>
                  ) : null;
                })()}
                {/* Dropdown list */}
                {classTcherDropdownOpen && (
                  <div className="absolute z-50 mt-1 w-full bg-surface border border-border rounded-xl shadow-xl overflow-hidden">
                    <div className="max-h-48 overflow-y-auto">
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setFormData({ ...formData, classTeacherId: undefined });
                          setFacultySearchQuery('');
                          setClassTcherDropdownOpen(false);
                        }}
                        className="w-full text-left px-3.5 py-2 text-xs text-muted-foreground hover:bg-surface-subtle border-b border-border"
                      >
                        — No Class Teacher Assigned —
                      </button>
                      {faculty
                        .filter((f) => {
                          const q = facultySearchQuery.toLowerCase();
                          return (
                            !q ||
                            f.name.toLowerCase().includes(q) ||
                            getFacultyInitials(f).toLowerCase().includes(q) ||
                            f.designation.toLowerCase().includes(q)
                          );
                        })
                        .map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setFormData({ ...formData, classTeacherId: f.id });
                              setFacultySearchQuery('');
                              setClassTcherDropdownOpen(false);
                            }}
                            className={cn(
                              'w-full text-left px-3.5 py-2 text-xs hover:bg-surface-subtle flex items-center gap-2',
                              formData.classTeacherId === f.id && 'bg-indigo-50 text-indigo-700'
                            )}
                          >
                            <span className="font-mono font-black text-indigo-800">[{getFacultyInitials(f)}]</span>
                            <span className="font-medium text-foreground">{f.name}</span>
                            <span className="text-muted-foreground ml-auto">{f.designation}</span>
                          </button>
                        ))}
                      {faculty.filter((f) => {
                        const q = facultySearchQuery.toLowerCase();
                        return !q || f.name.toLowerCase().includes(q) || getFacultyInitials(f).toLowerCase().includes(q);
                      }).length === 0 && (
                        <div className="px-3.5 py-3 text-xs text-muted-foreground text-center italic">
                          No faculty match "{facultySearchQuery}"
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <span className="text-[11px] text-muted-foreground mt-1 block">
                  Assigning a Class Teacher displays their name on this class timetable and tags this class in their faculty profile.
                </span>
              </div>
            </>
          )}

          {/* Lab Form */}
          {activeTab === 'labs' && (
            <>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Lab Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AI & Robotics Lab (EL-002)"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Capacity (Workstations)
                </label>
                <input
                  type="number"
                  min={10}
                  max={120}
                  value={formData.capacity || 36}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) })
                  }
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location || ''}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
            </>
          )}

          {/* Room Form */}
          {activeTab === 'rooms' && (
            <>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Room Name / Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. EL-301"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Capacity (Seats)
                </label>
                <input
                  type="number"
                  min={20}
                  max={200}
                  value={formData.capacity || 70}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: parseInt(e.target.value) })
                  }
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Building / Floor
                </label>
                <input
                  type="text"
                  value={formData.building || ''}
                  onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
            </>
          )}

          {/* Faculty Form */}
          {activeTab === 'faculty' && (() => {
            const currentRoles: string[] = formData.roles || [];
            const otherHod = faculty.find(
              (f) => f.id !== editingItem?.id && f.roles?.includes('Head of Department (HOD)')
            );
            const otherIncharges = faculty.filter(
              (f) => f.id !== editingItem?.id && f.roles?.includes('Timetable Incharge')
            );
            const inchargeCount = otherIncharges.length + (currentRoles.includes('Timetable Incharge') ? 1 : 0);
            const isInchargeDisabled = otherIncharges.length >= 5 && !currentRoles.includes('Timetable Incharge');

            return (
              <>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Faculty Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Sarah Vance"
                    value={formData.name || ''}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-foreground uppercase">
                      Faculty Nickname / Short Code
                    </label>
                    <span className="text-[10.5px] text-muted-foreground font-mono">
                      Auto-generates capital initials if empty
                    </span>
                  </div>
                  <input
                    type="text"
                    placeholder="e.g. SV, KK, VAP (Optional)"
                    value={formData.nickname || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, nickname: e.target.value.toUpperCase() })
                    }
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase mb-1">
                      Designation
                    </label>
                    <input
                      type="text"
                      value={formData.designation ?? ''}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      placeholder="e.g. Assistant Professor"
                      className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-foreground uppercase mb-1">
                      Max Hours / Week
                    </label>
                    <input
                      type="number"
                      min={4}
                      max={40}
                      value={formData.maxWeeklyHours || 20}
                      onChange={(e) =>
                        setFormData({ ...formData, maxWeeklyHours: parseInt(e.target.value) })
                      }
                      className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>

                {/* Special Designations / Roles Assignment */}
                <div className="p-3 bg-surface-subtle border border-border rounded-xl space-y-2.5">
                  <label className="block text-xs font-bold text-foreground uppercase">
                    Institutional Roles & Responsibilities
                  </label>

                  {/* Timetable Incharge */}
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="role-timetable-incharge"
                      checked={currentRoles.includes('Timetable Incharge')}
                      disabled={isInchargeDisabled}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...currentRoles, 'Timetable Incharge']
                          : currentRoles.filter((r) => r !== 'Timetable Incharge');
                        setFormData({ ...formData, roles: updated });
                      }}
                      className="mt-0.5 rounded text-primary focus:ring-accent"
                    />
                    <div className="flex-1 text-xs">
                      <label htmlFor="role-timetable-incharge" className="font-bold text-foreground cursor-pointer flex items-center gap-2">
                        Timetable Incharge
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {inchargeCount} / 5 Assigned
                        </span>
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Multiple faculty can hold this role (maximum limit: 5). Listed in Publishing Studio tables & signatures.
                      </p>
                      {isInchargeDisabled && (
                        <p className="text-[10.5px] text-amber-600 font-medium mt-0.5">
                          Maximum limit of 5 Timetable Incharges reached. Uncheck on another faculty to reassign.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Head of Department (HOD) */}
                  <div className="flex items-start gap-2.5 pt-2 border-t border-border/60">
                    <input
                      type="checkbox"
                      id="role-hod"
                      checked={currentRoles.includes('Head of Department (HOD)')}
                      onChange={(e) => {
                        const updated = e.target.checked
                          ? [...currentRoles.filter((r) => r !== 'Head of Department (HOD)'), 'Head of Department (HOD)']
                          : currentRoles.filter((r) => r !== 'Head of Department (HOD)');
                        setFormData({ ...formData, roles: updated });
                      }}
                      className="mt-0.5 rounded text-rose-600 focus:ring-rose-500"
                    />
                    <div className="flex-1 text-xs">
                      <label htmlFor="role-hod" className="font-bold text-foreground cursor-pointer flex items-center gap-2">
                        Head of Department (HOD)
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-50 text-rose-700 border border-rose-200">
                          Max 1 Allowed
                        </span>
                      </label>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Only one faculty member can hold the HOD role at any time. Displayed in Publishing Studio & official signoffs.
                      </p>
                      {otherHod && (
                        <p className="text-[10.5px] text-amber-700 font-medium mt-0.5">
                          ⚠️ Note: Currently held by <strong>{otherHod.name}</strong>. Checking this will reassign HOD to this faculty.
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-bold text-foreground uppercase">
                      Assigned Subjects Taught (Multi-select)
                    </label>
                    <div className="flex items-center gap-1.5">
                      {(formData.subjectIds || []).length > 0 && (
                        <span className="text-[10.5px] font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-200 rounded-md px-1.5 py-0.5">
                          {(formData.subjectIds || []).length} assigned
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Search bar & quick actions */}
                  <div className="space-y-1.5 mb-1.5">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <input
                        type="text"
                        placeholder="Search subjects by name, code, or abbreviation…"
                        value={subjectSearchQuery}
                        onChange={(e) => setSubjectSearchQuery(e.target.value)}
                        className="w-full bg-surface border border-border rounded-xl pl-8 pr-8 py-2 text-xs text-foreground placeholder:text-muted focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                      />
                      {subjectSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSubjectSearchQuery('')}
                          className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground hover:text-foreground text-xs"
                          title="Clear search"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {/* Quick filter action toolbar */}
                    {(() => {
                      const filteredList = subjects.filter((s) => {
                        const q = subjectSearchQuery.toLowerCase();
                        return (
                          !q ||
                          s.name.toLowerCase().includes(q) ||
                          (s.code || '').toLowerCase().includes(q) ||
                          (s.abbreviation || '').toLowerCase().includes(q)
                        );
                      });

                      const allFilteredSelected =
                        filteredList.length > 0 &&
                        filteredList.every((s) => (formData.subjectIds || []).includes(s.id));

                      return (
                        <div className="flex items-center justify-between text-[11px] px-1 text-muted-foreground">
                          <span>
                            Showing <strong>{filteredList.length}</strong> of {subjects.length} subjects
                          </span>
                          {filteredList.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const current = formData.subjectIds || [];
                                if (allFilteredSelected) {
                                  const filteredIds = new Set(filteredList.map((s) => s.id));
                                  setFormData({
                                    ...formData,
                                    subjectIds: current.filter((id: string) => !filteredIds.has(id)),
                                  });
                                } else {
                                  const union = Array.from(
                                    new Set([...current, ...filteredList.map((s) => s.id)])
                                  );
                                  setFormData({ ...formData, subjectIds: union });
                                }
                              }}
                              className="text-primary hover:underline font-semibold"
                            >
                              {allFilteredSelected ? 'Deselect visible' : 'Select all visible'}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {/* Filtered Subjects List */}
                  <div className="space-y-1 max-h-52 overflow-y-auto p-1.5 border border-border rounded-xl bg-surface-subtle">
                    {subjects
                      .filter((s) => {
                        const q = subjectSearchQuery.toLowerCase();
                        return (
                          !q ||
                          s.name.toLowerCase().includes(q) ||
                          (s.code || '').toLowerCase().includes(q) ||
                          (s.abbreviation || '').toLowerCase().includes(q)
                        );
                      })
                      .map((s) => {
                        const isChecked = (formData.subjectIds || []).includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={cn(
                              'flex items-center gap-2 p-2 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                              isChecked
                                ? 'bg-primary/10 border border-primary/20 text-foreground shadow-xs'
                                : 'hover:bg-surface text-foreground border border-transparent'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = formData.subjectIds || [];
                                const updated = e.target.checked
                                  ? [...current, s.id]
                                  : current.filter((id: string) => id !== s.id);
                                setFormData({ ...formData, subjectIds: updated });
                              }}
                              className="rounded text-primary focus:ring-accent shrink-0"
                            />
                            <span className="font-mono font-bold text-[11px] bg-surface border border-border px-1.5 py-0.5 rounded shrink-0">
                              {s.code || s.abbreviation}
                            </span>
                            <span className="truncate flex-1 font-medium">{s.name}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-amber-50 text-amber-800 border border-amber-200 shrink-0 font-semibold">
                              {s.credits ?? 3}Cr
                            </span>
                            {s.semester && (
                              <span className="text-[10px] text-muted-foreground font-mono shrink-0 hidden sm:inline">
                                Sem {s.semester}
                              </span>
                            )}
                          </label>
                        );
                      })}
                    {subjects.filter((s) => {
                      const q = subjectSearchQuery.toLowerCase();
                      return !q || s.name.toLowerCase().includes(q) || (s.code || '').toLowerCase().includes(q) || (s.abbreviation || '').toLowerCase().includes(q);
                    }).length === 0 && (
                      <div className="py-4 text-center text-xs text-muted-foreground italic">
                        No subjects match "{subjectSearchQuery}"
                      </div>
                    )}
                  </div>
                </div>
              </>
            );
          })()}

          {/* Subject Form */}
          {activeTab === 'subjects' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Code *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CS701"
                    value={formData.code || ''}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm font-mono text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Abbreviation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DL, NLP"
                    value={formData.abbreviation || ''}
                    onChange={(e) => setFormData({ ...formData, abbreviation: e.target.value.toUpperCase() })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm font-mono uppercase text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type || 'lecture'}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  >
                    <option value="lecture">1-Hour Lecture</option>
                    <option value="lab">2-Hour Lab</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Subject Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deep Learning & Neural Nets"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Semester
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={8}
                    value={formData.semester || 7}
                    onChange={(e) =>
                      setFormData({ ...formData, semester: parseInt(e.target.value) })
                    }
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Credits (1 – 4) *
                  </label>
                  <select
                    value={formData.credits ?? (formData.type === 'lab' ? 2 : 3)}
                    onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value, 10) })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm font-semibold text-foreground focus:ring-2 focus:ring-accent"
                  >
                    <option value={1}>1 Credit (Minor / Tutorial)</option>
                    <option value={2}>2 Credits (Practical / Lab)</option>
                    <option value={3}>3 Credits (Standard Theory)</option>
                    <option value={4}>4 Credits (Core Course / Major)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={formData.department ?? ''}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
            </>
          )}

          {/* Form Actions */}
          <div className="pt-4 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="md"
              onClick={() => setIsDrawerOpen(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="md" disabled={isSaving} className="gap-2">
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : null}
              {isSaving ? 'Saving...' : editingItem ? 'Save Updates' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteCandidate}
        onClose={() => setDeleteCandidate(null)}
        title="Confirm Deletion"
        description="This will permanently delete this record and automatically clean up associated timetable slots."
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <div>
              Are you sure you want to delete{' '}
              <strong className="text-rose-900">{deleteCandidate?.name}</strong>?
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" size="md" onClick={() => setDeleteCandidate(null)} disabled={isSaving}>
              Cancel
            </Button>
            <Button variant="danger" size="md" onClick={handleConfirmDelete} disabled={isSaving} className="gap-2">
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : null}
              {isSaving ? 'Deleting...' : 'Delete Record'}
            </Button>
          </div>
        </div>
      </Modal>

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
        <form onSubmit={handleExecuteProtectedReset} className="space-y-4">
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
    </div>
  );
}
