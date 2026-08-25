'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Trash2,
  User,
  BookOpen,
  MapPin,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { TIME_SLOTS } from '@/lib/constants';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  checkAssignmentConflict,
  getFacultyAvailabilityForSlot,
} from '@/lib/conflict-checker';
import { TargetType } from '@/types/timetable';

export function SlotDrawer() {
  const activeSlotEditor = useTimetableStore((s) => s.activeSlotEditor);
  const closeSlotEditor = useTimetableStore((s) => s.closeSlotEditor);
  const selectedTargetType = useTimetableStore((s) => s.selectedTargetType);
  const selectedTargetId = useTimetableStore((s) => s.selectedTargetId);

  const classes = useTimetableStore((s) => s.classes);
  const labs = useTimetableStore((s) => s.labs);
  const rooms = useTimetableStore((s) => s.rooms);
  const facultyList = useTimetableStore((s) => s.faculty);
  const subjectList = useTimetableStore((s) => s.subjects);
  const assignments = useTimetableStore((s) => s.assignments);

  const addAssignment = useTimetableStore((s) => s.addAssignment);
  const updateAssignment = useTimetableStore((s) => s.updateAssignment);
  const deleteAssignment = useTimetableStore((s) => s.deleteAssignment);

  // Form local state
  const [facultyId, setFacultyId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState<1 | 2>(1);
  const [roomId, setRoomId] = useState('');
  const [labId, setLabId] = useState('');
  const [classId, setClassId] = useState('');

  const isOpen = !!activeSlotEditor?.isOpen;
  const day = activeSlotEditor?.day || 'Mon';
  const startSlot = activeSlotEditor?.startSlot ?? 0;
  const assignmentId = activeSlotEditor?.assignmentId;

  // Initialize or prefill form when drawer opens
  useEffect(() => {
    if (!isOpen) return;

    if (assignmentId) {
      const existing = assignments.find((a) => a.id === assignmentId);
      if (existing) {
        setFacultyId(existing.facultyId);
        setSubjectId(existing.subjectId);
        setDuration(existing.duration);
        setRoomId(existing.roomId || '');
        setLabId(existing.labId || '');
        setClassId(existing.classId || '');
        return;
      }
    }

    // Default initializations for new slot
    const defaultDur: 1 | 2 = selectedTargetType === 'lab' ? 2 : 1;
    setDuration(defaultDur);
    setFacultyId('');
    setSubjectId('');
    setRoomId(rooms[0]?.id || '');
    setLabId(labs[0]?.id || '');
    setClassId(classes[0]?.id || '');
  }, [isOpen, assignmentId, assignments, selectedTargetType, rooms, labs, classes]);

  // Current Target Name
  const currentTargetName = useMemo(() => {
    if (selectedTargetType === 'class') {
      return classes.find((c) => c.id === selectedTargetId)?.name || 'Class';
    }
    if (selectedTargetType === 'lab') {
      return labs.find((l) => l.id === selectedTargetId)?.name || 'Lab';
    }
    return rooms.find((r) => r.id === selectedTargetId)?.name || 'Room';
  }, [selectedTargetType, selectedTargetId, classes, labs, rooms]);

  // Pre-filter faculty availability with allocated hours
  const facultyAvailability = useMemo(() => {
    if (!isOpen) return [];
    return getFacultyAvailabilityForSlot(
      day,
      startSlot,
      duration,
      assignments,
      facultyList,
      assignmentId
    );
  }, [isOpen, day, startSlot, duration, assignments, facultyList, assignmentId]);

  // Filter subjects based on chosen faculty
  const availableSubjects = useMemo(() => {
    if (!facultyId) return subjectList;
    const selectedFac = facultyList.find((f) => f.id === facultyId);
    if (!selectedFac || !selectedFac.subjectIds.length) return subjectList;
    return subjectList.filter((s) => selectedFac.subjectIds.includes(s.id));
  }, [facultyId, facultyList, subjectList]);

  // Auto-switch duration if subject is Lab
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const subj = subjectList.find((s) => s.id === newSubjectId);
    if (subj?.type === 'lab') {
      setDuration(2);
    } else if (selectedTargetType !== 'lab') {
      setDuration(1);
    }
  };

  // Run comprehensive Conflict Check
  const conflictResult = useMemo(() => {
    if (!facultyId || !subjectId) {
      return {
        hasConflict: false,
        canBook: false,
        errors: [],
        warnings: [],
        facultyAllocatedHours: 0,
        facultyMaxHours: 20,
      };
    }

    return checkAssignmentConflict({
      assignments,
      facultyList,
      classList: classes,
      labList: labs,
      roomList: rooms,
      subjectList,
      assignmentToValidate: {
        id: assignmentId,
        day,
        startSlot,
        duration,
        targetType: selectedTargetType,
        targetId: selectedTargetId,
        facultyId,
        subjectId,
        roomId: selectedTargetType === 'class' ? roomId : undefined,
        labId: duration === 2 && selectedTargetType === 'class' ? labId : undefined,
        classId: selectedTargetType !== 'class' ? classId : undefined,
      },
    });
  }, [
    facultyId,
    subjectId,
    assignmentId,
    day,
    startSlot,
    duration,
    selectedTargetType,
    selectedTargetId,
    roomId,
    labId,
    classId,
    assignments,
    facultyList,
    classes,
    labs,
    rooms,
    subjectList,
  ]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictResult.canBook) return;

    const payload = {
      day,
      startSlot,
      duration,
      targetType: selectedTargetType,
      targetId: selectedTargetId,
      facultyId,
      subjectId,
      roomId: selectedTargetType === 'class' ? roomId : undefined,
      labId: duration === 2 && selectedTargetType === 'class' ? labId : undefined,
      classId: selectedTargetType !== 'class' ? classId : undefined,
    };

    if (assignmentId) {
      updateAssignment(assignmentId, payload);
    } else {
      addAssignment(payload);
    }

    closeSlotEditor();
  };

  const handleDelete = () => {
    if (assignmentId && confirm('Remove this scheduled session from the timetable?')) {
      deleteAssignment(assignmentId);
      closeSlotEditor();
    }
  };

  const currentSlotObj = TIME_SLOTS[startSlot];
  const endSlotTime = duration === 2 ? TIME_SLOTS[startSlot + 1]?.end || '06:00' : currentSlotObj?.end;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeSlotEditor}
      title={
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-light flex items-center justify-center text-primary font-bold">
            {duration === 2 ? <FlaskConical className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {assignmentId ? 'Edit Scheduled Slot' : 'Assign Time Slot'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {currentTargetName} ({selectedTargetType.toUpperCase()})
            </p>
          </div>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-2 font-mono text-xs">
          <span className="bg-surface px-2 py-0.5 rounded border border-border text-foreground font-bold">
            {day}
          </span>
          <span className="text-muted-foreground">
            {currentSlotObj?.start} — {endSlotTime} ({duration} hr{duration > 1 ? 's' : ''})
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Slot Duration Selector */}
        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Session Duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDuration(1)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                duration === 1
                  ? 'bg-primary-light border-primary text-primary shadow-xs'
                  : 'bg-surface border-border text-muted hover:border-border-strong'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              1 Hour (Lecture)
            </button>
            <button
              type="button"
              onClick={() => setDuration(2)}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                duration === 2
                  ? 'bg-highlight-light border-highlight text-highlight shadow-xs'
                  : 'bg-surface border-border text-muted hover:border-border-strong'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              2 Hours (Lab Block)
            </button>
          </div>
        </div>

        {/* Faculty Combobox / Select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Faculty Member *
            </label>
            <span className="text-[11px] text-muted-foreground">Pre-filtered for availability</span>
          </div>

          <div className="space-y-1.5">
            <select
              aria-label="Select Faculty Member"
              value={facultyId}
              onChange={(e) => {
                setFacultyId(e.target.value);
                // If current subject is not taught by new faculty, reset subject
                const newFac = facultyList.find((f) => f.id === e.target.value);
                if (newFac && subjectId && !newFac.subjectIds.includes(subjectId)) {
                  setSubjectId('');
                }
              }}
              required
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">-- Choose Faculty --</option>
              {facultyAvailability.map(({ faculty, isAvailable, allocatedHours, maxHours, conflictReason }) => (
                <option key={faculty.id} value={faculty.id} disabled={!isAvailable}>
                  {isAvailable ? '✓ ' : '✕ '} {faculty.name} ({allocatedHours}/{maxHours}h)
                  {!isAvailable ? ` - ${conflictReason}` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Subject Select */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Subject *
            </label>
            {facultyId && (
              <span className="text-[11px] text-primary font-medium">
                {availableSubjects.length} subjects taught
              </span>
            )}
          </div>
          <select
            aria-label="Select Subject"
            value={subjectId}
            onChange={(e) => handleSubjectChange(e.target.value)}
            required
            className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
          >
            <option value="">-- Choose Subject --</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                [{s.code}] {s.name} ({s.type.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        {/* Location Assignment */}
        {selectedTargetType === 'class' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                Lecture Room
              </label>
              <select
                aria-label="Select Lecture Room"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
              >
                <option value="">-- Default Class Room --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name} ({r.capacity} seats)
                  </option>
                ))}
              </select>
            </div>

            {duration === 2 && (
              <div>
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
                  Lab Facility
                </label>
                <select
                  aria-label="Select Lab Facility"
                  value={labId}
                  onChange={(e) => setLabId(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  <option value="">-- Assign Lab --</option>
                  {labs.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.capacity} cap)
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* If target is Lab/Room, which Class is attending */}
        {selectedTargetType !== 'class' && (
          <div>
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1.5">
              Attending Student Group / Class *
            </label>
            <select
              aria-label="Select Attending Student Group"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
              className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value="">-- Choose Class --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (Sem {c.semester} - Sec {c.section})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Real-time Conflict & Warning Banners */}
        {conflictResult.errors.length > 0 && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl space-y-1.5">
            <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Scheduling Conflict Detected</span>
            </div>
            <ul className="text-xs text-rose-700 space-y-1 list-disc pl-5">
              {conflictResult.errors.map((err, i) => (
                <li key={i}>{err}</li>
              ))}
            </ul>
          </div>
        )}

        {conflictResult.warnings.length > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-1">
            <div className="flex items-center gap-1.5 text-amber-800 font-bold text-xs">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              <span>Notice</span>
            </div>
            <ul className="text-xs text-amber-800 space-y-0.5 list-disc pl-4">
              {conflictResult.warnings.map((warn, i) => (
                <li key={i}>{warn}</li>
              ))}
            </ul>
          </div>
        )}

        {facultyId && subjectId && conflictResult.canBook && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              Conflict-free slot confirmed! Faculty hours:{' '}
              <strong>
                {conflictResult.facultyAllocatedHours + duration} / {conflictResult.facultyMaxHours} hrs
              </strong>
            </span>
          </div>
        )}

        {/* Form Action Controls */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3">
          {assignmentId ? (
            <Button
              type="button"
              variant="danger"
              size="md"
              onClick={handleDelete}
              className="gap-1.5 text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Remove Slot
            </Button>
          ) : (
            <Button type="button" variant="ghost" size="md" onClick={closeSlotEditor}>
              Cancel
            </Button>
          )}

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={!facultyId || !subjectId || !conflictResult.canBook}
              className="gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {assignmentId ? 'Save Changes' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
