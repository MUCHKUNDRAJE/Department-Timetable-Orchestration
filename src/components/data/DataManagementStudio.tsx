'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { CollegeClass, Lab, Room, Faculty, Subject } from '@/types/timetable';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Drawer } from '@/components/ui/Drawer';
import { Modal } from '@/components/ui/Modal';
import { calculateFacultyAllocatedHours } from '@/lib/conflict-checker';
import { cn, getFacultyInitials } from '@/lib/utils';

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
  const [isSaving, setIsSaving]       = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [apiError, setApiError]       = useState<string | null>(null);

  // Form Fields State
  const [formData, setFormData] = useState<any>({});

  const handleOpenCreate = () => {
    setEditingItem(null);
    if (activeTab === 'classes') {
      setFormData({
        name: '',
        department: 'Artificial Intelligence & Data Science',
        semester: 7,
        section: 'A',
        studentCount: 60,
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
        email: '',
        maxWeeklyHours: 20,
        subjectIds: [],
      });
    } else if (activeTab === 'subjects') {
      setFormData({
        name: '',
        code: '',
        type: 'lecture',
        color: '#5755FE',
        department: 'AIDS',
        semester: 7,
      });
    }
    setIsDrawerOpen(true);
  };

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setFormData({ ...item });
    setIsDrawerOpen(true);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setApiError(null);
    try {
      if (editingItem) {
        if (activeTab === 'classes') await updateClass(editingItem.id, formData);
        if (activeTab === 'labs')    await updateLab(editingItem.id, formData);
        if (activeTab === 'rooms')   await updateRoom(editingItem.id, formData);
        if (activeTab === 'faculty') await updateFaculty(editingItem.id, formData);
        if (activeTab === 'subjects') await updateSubject(editingItem.id, formData);
      } else {
        if (activeTab === 'classes') await addClass(formData);
        if (activeTab === 'labs')    await addLab(formData);
        if (activeTab === 'rooms')   await addRoom(formData);
        if (activeTab === 'faculty') await addFaculty(formData);
        if (activeTab === 'subjects') await addSubject(formData);
      }
      setIsDrawerOpen(false);
    } catch (err: any) {
      setApiError(err.message || 'Failed to save. Is the backend running?');
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteCandidate) return;
    const { id, type } = deleteCandidate;
    setIsSaving(true);
    setApiError(null);
    try {
      if (type === 'classes')  await deleteClass(id);
      if (type === 'labs')     await deleteLab(id);
      if (type === 'rooms')    await deleteRoom(id);
      if (type === 'faculty')  await deleteFaculty(id);
      if (type === 'subjects') await deleteSubject(id);
      setDeleteCandidate(null);
    } catch (err: any) {
      setApiError(err.message || 'Failed to delete. Is the backend running?');
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
    } catch (err: any) {
      setApiError(err.message || 'Export failed. Is the backend running?');
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
          alert('Institutional timetable database imported successfully!');
        } else {
          alert('Invalid timetable JSON schema.');
        }
      } catch (err: any) {
        setApiError(err.message || 'Import failed. Check the file format and backend.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
                  .map((c) => (
                    <tr key={c.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4 font-bold text-foreground">{c.name}</td>
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
                  ))}
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
                  <th className="p-4">Designation</th>
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
                        <td className="p-4 text-muted-foreground">{f.designation}</td>
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
                              >
                                {s.code}
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
                  <th className="p-4">Code</th>
                  <th className="p-4">Subject Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Semester</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {subjects
                  .filter((s) => s.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((s) => (
                    <tr key={s.id} className="hover:bg-surface-hover transition-colors">
                      <td className="p-4">
                        <span className="font-mono font-extrabold text-xs bg-primary-light text-primary px-2 py-1 rounded">
                          {s.code}
                        </span>
                      </td>
                      <td className="p-4 font-bold text-foreground">{s.name}</td>
                      <td className="p-4">
                        <Badge variant={s.type === 'lab' ? 'highlight' : 'primary'} size="sm">
                          {s.type.toUpperCase()}
                        </Badge>
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
                    value={formData.section || 'A'}
                    onChange={(e) => setFormData({ ...formData, section: e.target.value })}
                    className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-foreground uppercase mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={formData.department || 'Artificial Intelligence & Data Science'}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  className="w-full bg-surface border border-border rounded-xl px-3.5 py-2 text-sm text-foreground focus:ring-2 focus:ring-accent"
                />
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
          {activeTab === 'faculty' && (
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
                    value={formData.designation || 'Assistant Professor'}
                    onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
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
                <label className="block text-xs font-bold text-foreground uppercase mb-2">
                  Assigned Subjects Taught (Multi-select)
                </label>
                <div className="space-y-1.5 max-h-48 overflow-y-auto p-2 border border-border rounded-xl bg-surface-subtle">
                  {subjects.map((s) => {
                    const isChecked = (formData.subjectIds || []).includes(s.id);
                    return (
                      <label
                        key={s.id}
                        className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-surface text-xs font-medium cursor-pointer"
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
                          className="rounded text-primary focus:ring-accent"
                        />
                        <span className="font-mono font-bold text-foreground">{s.code}</span>
                        <span className="truncate text-muted-foreground">{s.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </>
          )}

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
                <div className="col-span-2">
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
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
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
    </div>
  );
}
