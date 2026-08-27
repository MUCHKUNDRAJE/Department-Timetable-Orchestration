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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  checkAssignmentConflict,
  getFacultyAvailabilityForSlot,
  getRoomAvailabilityForSlot,
  getLabAvailabilityForSlot,
  getClassAvailabilityForSlot,
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

    // Pick first available room if any, else default to first
    const freeRoom = rooms.find((r) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'room' && a.targetId === r.id) || a.roomId === r.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + a.duration) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    setRoomId(freeRoom?.id || rooms[0]?.id || '');

    // Pick first available lab if any
    const freeLab = labs.find((l) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'lab' && a.targetId === l.id) || a.labId === l.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + a.duration) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    setLabId(freeLab?.id || labs[0]?.id || '');

    // Pick first available class if any
    const freeClass = classes.find((c) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'class' && a.targetId === c.id) || a.classId === c.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + a.duration) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    setClassId(freeClass?.id || classes[0]?.id || '');
  }, [isOpen, assignmentId, assignments, selectedTargetType, rooms, labs, classes, day, startSlot]);

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

  // Pre-filter faculty availability with allocated hours & conflicts
  const facultyAvailability = useMemo(() => {
    if (!isOpen) return [];
    return getFacultyAvailabilityForSlot(
      day,
      startSlot,
      duration,
      assignments,
      facultyList,
      assignmentId,
      subjectList,
      classes,
      labs,
      rooms
    );
  }, [isOpen, day, startSlot, duration, assignments, facultyList, assignmentId, subjectList, classes, labs, rooms]);

  // Real-time Room Availability with conflict detection and where-used details
  const roomAvailability = useMemo(() => {
    if (!isOpen) return [];
    return getRoomAvailabilityForSlot(
      day,
      startSlot,
      duration,
      assignments,
      rooms,
      assignmentId,
      subjectList,
      classes,
      facultyList
    );
  }, [isOpen, day, startSlot, duration, assignments, rooms, assignmentId, subjectList, classes, facultyList]);

  // Real-time Lab Availability with conflict detection and where-used details
  const labAvailability = useMemo(() => {
    if (!isOpen) return [];
    return getLabAvailabilityForSlot(
      day,
      startSlot,
      duration,
      assignments,
      labs,
      assignmentId,
      subjectList,
      classes,
      facultyList
    );
  }, [isOpen, day, startSlot, duration, assignments, labs, assignmentId, subjectList, classes, facultyList]);

  // Real-time Class Availability with conflict detection
  const classAvailability = useMemo(() => {
    if (!isOpen) return [];
    return getClassAvailabilityForSlot(
      day,
      startSlot,
      duration,
      assignments,
      classes,
      assignmentId,
      subjectList,
      labs,
      rooms
    );
  }, [isOpen, day, startSlot, duration, assignments, classes, assignmentId, subjectList, labs, rooms]);

  // Filter subjects based on chosen faculty
  const availableSubjects = useMemo(() => {
    if (!facultyId) return subjectList;
    const selectedFac = facultyList.find((f) => f.id === facultyId);
    if (!selectedFac || !selectedFac.subjectIds.length) return subjectList;
    return subjectList.filter((s) => selectedFac.subjectIds.includes(s.id));
  }, [facultyId, facultyList, subjectList]);

  // Auto-switch duration and auto-fill room when subject changes
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const subj = subjectList.find((s) => s.id === newSubjectId);
    if (subj?.type === 'lab') {
      setDuration(2);
    } else if (selectedTargetType !== 'lab') {
      setDuration(1);
      // Auto-fill the first available room for lecture subjects when target is class
      if (selectedTargetType === 'class') {
        const availableRoom = roomAvailability.find((r) => r.isAvailable)?.room;
        if (availableRoom) {
          setRoomId(availableRoom.id);
        } else if (!roomId && rooms.length > 0) {
          setRoomId(rooms[0].id);
        }
      }
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
            <p className="text-sm text-muted-foreground">
              {currentTargetName} ({selectedTargetType.toUpperCase()})
            </p>
          </div>
        </div>
      }
      subtitle={
        <div className="flex items-center gap-2 mt-2 font-mono text-sm">
          <span className="bg-surface px-2 py-0.5 rounded border border-border text-foreground font-bold">
            {day}
          </span>
          <span className="text-muted-foreground">
            {currentSlotObj?.start} — {endSlotTime} ({duration} hr{duration > 1 ? 's' : ''})
          </span>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Slot Duration Selector */}
        <div>
          <label className="block text-sm font-bold text-foreground uppercase tracking-wider mb-2">
            Session Duration
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setDuration(1)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                duration === 1
                  ? 'bg-primary-light border-primary text-primary shadow-xs'
                  : 'bg-surface border-border text-muted hover:border-border-strong'
              }`}
            >
              <Clock className="w-4 h-4" />
              1 Hour (Lecture)
            </button>
            <button
              type="button"
              onClick={() => setDuration(2)}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-sm font-bold transition-all ${
                duration === 2
                  ? 'bg-highlight-light border-highlight text-highlight shadow-xs'
                  : 'bg-surface border-border text-muted hover:border-border-strong'
              }`}
            >
              <FlaskConical className="w-4 h-4" />
              2 Hours (Lab Block)
            </button>
          </div>
        </div>

        {/* Faculty Select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-foreground uppercase tracking-wider">
              Faculty Member *
            </label>
            <span className="text-xs text-muted-foreground">Pre-filtered for availability</span>
          </div>

          <Select
            value={facultyId}
            onValueChange={(val) => {
              setFacultyId(val);
              const newFac = facultyList.find((f) => f.id === val);
              if (newFac && subjectId && !newFac.subjectIds.includes(subjectId)) {
                setSubjectId('');
              }
            }}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Select Faculty Member" />
            </SelectTrigger>
            <SelectContent>
              {facultyAvailability.map(({ faculty, isAvailable, allocatedHours, maxHours, conflictReason, conflictDetail }) => (
                <SelectItem key={faculty.id} value={faculty.id} disabled={!isAvailable}>
                  <div className="flex flex-col gap-0.5 py-0.5 max-w-full">
                    <div className="flex items-center gap-1.5">
                      <span className={isAvailable ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'} aria-hidden>
                        {isAvailable ? '✓' : '✕'}
                      </span>
                      <span className="font-semibold">{faculty.name}</span>
                      <span className="text-muted-foreground text-[11px] ml-auto shrink-0 font-mono">
                        {allocatedHours}/{maxHours}h
                      </span>
                    </div>
                    {!isAvailable && (
                      <div className="text-[11px] text-rose-600 font-medium pl-4 leading-tight">
                        Not available at this point — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                      </div>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Subject Select */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-bold text-foreground uppercase tracking-wider">
              Subject *
            </label>
            {facultyId && (
              <span className="text-xs text-primary font-medium">
                {availableSubjects.length} subjects taught
              </span>
            )}
          </div>

          <Select
            value={subjectId}
            onValueChange={(val) => handleSubjectChange(val)}
          >
            <SelectTrigger className="w-full text-sm">
              <SelectValue placeholder="Select Subject" />
            </SelectTrigger>
            <SelectContent>
              {availableSubjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">{s.code}</span>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-muted-foreground text-[11px] ml-auto">{s.type.toUpperCase()}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Location Assignment */}
        {selectedTargetType === 'class' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-bold text-foreground uppercase tracking-wider">
                  Lecture Room
                </label>
                <span className="text-xs text-muted-foreground">Real-time occupancy check</span>
              </div>
              <Select value={roomId} onValueChange={(val) => setRoomId(val)}>
                <SelectTrigger className="w-full text-sm">
                  <SelectValue placeholder="Auto-selected or choose room" />
                </SelectTrigger>
                <SelectContent>
                  {roomAvailability.map(({ room, isAvailable, conflictReason, conflictDetail }) => (
                    <SelectItem key={room.id} value={room.id} disabled={!isAvailable}>
                      <div className="flex flex-col gap-0.5 py-0.5 max-w-full">
                        <div className="flex items-center gap-1.5">
                          <span className={isAvailable ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'} aria-hidden>
                            {isAvailable ? '✓' : '✕'}
                          </span>
                          <span className="font-semibold font-mono">{room.name}</span>
                          <span className="text-muted-foreground text-xs ml-auto shrink-0 font-mono">
                            {room.capacity} seats
                          </span>
                        </div>
                        {!isAvailable && (
                          <div className="text-[11px] text-rose-600 font-medium pl-4 leading-tight">
                            Not available at this point — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                          </div>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {duration === 2 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-bold text-foreground uppercase tracking-wider">
                    Lab Facility
                  </label>
                  <span className="text-xs text-muted-foreground">Real-time lab status</span>
                </div>
                <Select value={labId} onValueChange={(val) => setLabId(val)}>
                  <SelectTrigger className="w-full text-sm">
                    <SelectValue placeholder="Select Lab" />
                  </SelectTrigger>
                  <SelectContent>
                    {labAvailability.map(({ lab, isAvailable, conflictReason, conflictDetail }) => (
                      <SelectItem key={lab.id} value={lab.id} disabled={!isAvailable}>
                        <div className="flex flex-col gap-0.5 py-0.5 max-w-full">
                          <div className="flex items-center gap-1.5">
                            <span className={isAvailable ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'} aria-hidden>
                              {isAvailable ? '✓' : '✕'}
                            </span>
                            <span className="font-semibold">{lab.name}</span>
                            <span className="text-muted-foreground text-xs ml-auto shrink-0 font-mono">
                              {lab.capacity} cap
                            </span>
                          </div>
                          {!isAvailable && (
                            <div className="text-[11px] text-rose-600 font-medium pl-4 leading-tight">
                              Not available at this point — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* If target is Lab/Room, which Class is attending */}
        {selectedTargetType !== 'class' && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-sm font-bold text-foreground uppercase tracking-wider">
                Attending Student Group / Class *
              </label>
              <span className="text-xs text-muted-foreground">Class schedule check</span>
            </div>
            <Select value={classId} onValueChange={(val) => setClassId(val)}>
              <SelectTrigger className="w-full text-sm">
                <SelectValue placeholder="Select Attending Class" />
              </SelectTrigger>
              <SelectContent>
                {classAvailability.map(({ collegeClass: c, isAvailable, conflictReason, conflictDetail }) => (
                  <SelectItem key={c.id} value={c.id} disabled={!isAvailable}>
                    <div className="flex flex-col gap-0.5 py-0.5 max-w-full">
                      <div className="flex items-center gap-1.5">
                        <span className={isAvailable ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'} aria-hidden>
                          {isAvailable ? '✓' : '✕'}
                        </span>
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-muted-foreground text-xs ml-auto shrink-0">
                          Sem {c.semester} · Sec {c.section}
                        </span>
                      </div>
                      {!isAvailable && (
                        <div className="text-[11px] text-rose-600 font-medium pl-4 leading-tight">
                          Not available at this point — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                        </div>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
