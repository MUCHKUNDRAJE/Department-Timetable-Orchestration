'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle2,
  Trash2,
  FlaskConical,
  Sparkles,
  Layers,
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { TIME_SLOTS } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
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
  calculateFacultyAllocatedHours,
} from '@/lib/conflict-checker';
import { LabBatch } from '@/types/timetable';

type BatchKey = 'A1' | 'A2' | 'A3' | 'A4';
const BATCH_KEYS: BatchKey[] = ['A1', 'A2', 'A3', 'A4'];

interface BatchData {
  facultyId: string;
  subjectId: string;
  labId: string;
}

const BATCH_COLORS: Record<BatchKey, { badge: string; border: string; bg: string; title: string }> = {
  A1: {
    badge: 'bg-indigo-600 text-white',
    border: 'border-indigo-200 hover:border-indigo-400',
    bg: 'bg-indigo-50/40',
    title: 'A1 Batch',
  },
  A2: {
    badge: 'bg-purple-600 text-white',
    border: 'border-purple-200 hover:border-purple-400',
    bg: 'bg-purple-50/40',
    title: 'A2 Batch',
  },
  A3: {
    badge: 'bg-teal-600 text-white',
    border: 'border-teal-200 hover:border-teal-400',
    bg: 'bg-teal-50/40',
    title: 'A3 Batch',
  },
  A4: {
    badge: 'bg-amber-600 text-white',
    border: 'border-amber-200 hover:border-amber-400',
    bg: 'bg-amber-50/40',
    title: 'A4 Batch',
  },
};

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

  // Form local state for 1-hour lecture
  const [facultyId, setFacultyId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [duration, setDuration] = useState<1 | 2>(1);
  const [roomId, setRoomId] = useState('');
  const [labId, setLabId] = useState('');
  const [classId, setClassId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // 4-Batch state for 2-hour lab sessions (A1, A2, A3, A4) - strictly labs only
  const [batches, setBatches] = useState<Record<BatchKey, BatchData>>({
    A1: { facultyId: '', subjectId: '', labId: '' },
    A2: { facultyId: '', subjectId: '', labId: '' },
    A3: { facultyId: '', subjectId: '', labId: '' },
    A4: { facultyId: '', subjectId: '', labId: '' },
  });

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
        const targetClass = selectedTargetType === 'class' ? classes.find((c) => c.id === selectedTargetId) : undefined;
        const targetSemester = targetClass?.semester;

        const lectureSubjects = subjectList.filter(
          (s) => s.type === 'lecture' && (targetSemester ? s.semester === targetSemester : true)
        );
        const finalLectureSubjects = lectureSubjects.length > 0 ? lectureSubjects : subjectList;

        const effectiveFacultyId = existing.facultyId || facultyList[0]?.id || '';
        const matchingFac = facultyList.find((f) => f.id === effectiveFacultyId);
        const effectiveSubjectId =
          existing.subjectId ||
          finalLectureSubjects.find((s) => matchingFac?.subjectIds?.includes(s.id))?.id ||
          finalLectureSubjects[0]?.id ||
          subjectList[0]?.id ||
          '';

        const freeRoom = rooms.find((r) => {
          return !assignments.some(
            (a) =>
              a.id !== assignmentId &&
              a.day === day &&
              ((a.targetType === 'room' && a.targetId === r.id) || a.roomId === r.id) &&
              Math.max(startSlot, a.startSlot) < Math.min(startSlot + (existing.duration || 1), a.startSlot + a.duration)
          );
        });

        setFacultyId(effectiveFacultyId);
        setSubjectId(effectiveSubjectId);
        setDuration(existing.duration || 1);
        setRoomId(existing.roomId || freeRoom?.id || rooms[0]?.id || '');
        setLabId(existing.labId || labs[0]?.id || '');
        setClassId(existing.classId || classes[0]?.id || '');

        if (existing.labBatches && existing.labBatches.length > 0) {
          const loadedBatches: Record<BatchKey, BatchData> = {
            A1: { facultyId: '', subjectId: '', labId: '' },
            A2: { facultyId: '', subjectId: '', labId: '' },
            A3: { facultyId: '', subjectId: '', labId: '' },
            A4: { facultyId: '', subjectId: '', labId: '' },
          };
          existing.labBatches.forEach((b) => {
            if (b.id in loadedBatches) {
              loadedBatches[b.id as BatchKey] = {
                facultyId: b.facultyId || effectiveFacultyId,
                subjectId: b.subjectId || effectiveSubjectId,
                labId: b.labId || labs[0]?.id || '',
              };
            }
          });
          setBatches(loadedBatches);
        } else {
          setBatches({
            A1: {
              facultyId: effectiveFacultyId,
              subjectId: effectiveSubjectId,
              labId: existing.labId || labs[0]?.id || '',
            },
            A2: { facultyId: facultyList[1]?.id || effectiveFacultyId, subjectId: effectiveSubjectId, labId: labs[1]?.id || labs[0]?.id || '' },
            A3: { facultyId: facultyList[2]?.id || effectiveFacultyId, subjectId: effectiveSubjectId, labId: labs[2]?.id || labs[0]?.id || '' },
            A4: { facultyId: facultyList[3]?.id || effectiveFacultyId, subjectId: effectiveSubjectId, labId: labs[3]?.id || labs[0]?.id || '' },
          });
        }
        return;
      }
    }

    // Default initializations for new slot
    const defaultDur: 1 | 2 = activeSlotEditor?.duration || (selectedTargetType === 'lab' ? 2 : 1);
    setDuration(defaultDur);

    const targetClass = selectedTargetType === 'class' ? classes.find((c) => c.id === selectedTargetId) : undefined;
    const targetSemester = targetClass?.semester;

    // 1. Available Room for 1-Hour Lecture
    const freeRoom = rooms.find((r) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'room' && a.targetId === r.id) || a.roomId === r.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + defaultDur) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    const defRoomId = freeRoom?.id || rooms[0]?.id || '';
    setRoomId(defRoomId);

    // 2. Available Labs
    const freeLabs = labs.filter((l) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'lab' && a.targetId === l.id) || a.labId === l.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + defaultDur) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    const defLabId = freeLabs[0]?.id || labs[0]?.id || '';
    setLabId(defLabId);

    // 3. Available Class (for lab/room target scheduling)
    const freeClass = classes.find((c) => {
      return !assignments.some(
        (a) =>
          a.day === day &&
          ((a.targetType === 'class' && a.targetId === c.id) || a.classId === c.id) &&
          ((startSlot >= a.startSlot && startSlot < a.startSlot + defaultDur) ||
            (startSlot + defaultDur > a.startSlot && startSlot + defaultDur <= a.startSlot + a.duration))
      );
    });
    setClassId(freeClass?.id || classes[0]?.id || '');

    // 4. Smart Lecture Faculty & Subject Pre-population
    const lectureSubjects = subjectList.filter(
      (s) => s.type === 'lecture' && (targetSemester ? s.semester === targetSemester : true)
    );
    const applicableLectureSubjects =
      lectureSubjects.length > 0 ? lectureSubjects : subjectList.filter((s) => s.type === 'lecture');
    const finalLectureSubjects = applicableLectureSubjects.length > 0 ? applicableLectureSubjects : subjectList;

    const availableFaculties1hr = facultyList.filter((f) => {
      const allocated = calculateFacultyAllocatedHours(f.id, assignments, assignmentId);
      if (allocated + 1 > f.maxWeeklyHours) return false;
      return !assignments.some(
        (a) =>
          a.id !== assignmentId &&
          a.day === day &&
          a.facultyId === f.id &&
          Math.max(startSlot, a.startSlot) < Math.min(startSlot + 1, a.startSlot + a.duration)
      );
    });

    const matchingFac =
      availableFaculties1hr.find((f) =>
        f.subjectIds.some((sid) => finalLectureSubjects.some((s) => s.id === sid))
      ) ||
      availableFaculties1hr[0] ||
      facultyList[0];

    const matchingSubj =
      finalLectureSubjects.find((s) => matchingFac?.subjectIds?.includes(s.id)) ||
      subjectList.find((s) => matchingFac?.subjectIds?.includes(s.id)) ||
      finalLectureSubjects[0] ||
      subjectList[0];

    setFacultyId(matchingFac?.id || facultyList[0]?.id || '');
    setSubjectId(matchingSubj?.id || subjectList[0]?.id || '');

    // 5. Smart 4-Batch Lab Pre-population
    const labSubjects = subjectList.filter(
      (s) => s.type === 'lab' && (targetSemester ? s.semester === targetSemester : true)
    );
    const applicableLabSubjects =
      labSubjects.length > 0 ? labSubjects : subjectList.filter((s) => s.type === 'lab');
    const finalLabSubjects = applicableLabSubjects.length > 0 ? applicableLabSubjects : subjectList;

    const availableFaculties2hr = facultyList.filter((f) => {
      const allocated = calculateFacultyAllocatedHours(f.id, assignments, assignmentId);
      if (allocated + 2 > f.maxWeeklyHours) return false;
      return !assignments.some(
        (a) =>
          a.id !== assignmentId &&
          a.day === day &&
          a.facultyId === f.id &&
          Math.max(startSlot, a.startSlot) < Math.min(startSlot + 2, a.startSlot + a.duration)
      );
    });

    const populatedBatches: Record<BatchKey, BatchData> = {
      A1: { facultyId: '', subjectId: '', labId: '' },
      A2: { facultyId: '', subjectId: '', labId: '' },
      A3: { facultyId: '', subjectId: '', labId: '' },
      A4: { facultyId: '', subjectId: '', labId: '' },
    };

    BATCH_KEYS.forEach((bKey, idx) => {
      const fac = availableFaculties2hr[idx] || facultyList[idx % facultyList.length];
      const lab = freeLabs[idx] || labs[idx % labs.length];
      const subj =
        finalLabSubjects.find((s) => fac?.subjectIds?.includes(s.id)) ||
        subjectList.find((s) => fac?.subjectIds?.includes(s.id)) ||
        finalLabSubjects[0] ||
        subjectList[0];

      populatedBatches[bKey] = {
        facultyId: fac?.id || '',
        subjectId: subj?.id || '',
        labId: lab?.id || '',
      };
    });

    setBatches(populatedBatches);
  }, [isOpen, assignmentId, assignments, selectedTargetType, selectedTargetId, rooms, labs, classes, day, startSlot, subjectList, facultyList, activeSlotEditor]);

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

  // Real-time Room Availability with conflict detection
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

  // Real-time Lab Availability with conflict detection
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

  // Filter subjects based on chosen faculty for 1-hr mode
  const availableSubjects = useMemo(() => {
    if (!facultyId) return subjectList;
    const selectedFac = facultyList.find((f) => f.id === facultyId);
    if (!selectedFac || !selectedFac.subjectIds.length) return subjectList;
    return subjectList.filter((s) => selectedFac.subjectIds.includes(s.id));
  }, [facultyId, facultyList, subjectList]);

  // Helper to get available subjects for a specific batch's chosen faculty
  const getBatchSubjects = (batchFacultyId: string) => {
    if (!batchFacultyId) return subjectList;
    const fac = facultyList.find((f) => f.id === batchFacultyId);
    if (!fac || !fac.subjectIds.length) return subjectList;
    return subjectList.filter((s) => fac.subjectIds.includes(s.id));
  };

  const updateBatchField = (batchKey: BatchKey, field: keyof BatchData, value: string) => {
    setBatches((prev) => ({
      ...prev,
      [batchKey]: {
        ...prev[batchKey],
        [field]: value,
      },
    }));
  };

  // Auto-switch duration and auto-fill room when subject changes (for 1-hr single mode)
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);
    const subj = subjectList.find((s) => s.id === newSubjectId);
    if (subj?.type === 'lab') {
      setDuration(2);
    } else if (selectedTargetType !== 'lab') {
      setDuration(1);
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

  // Run Conflict Check for 1-hr lecture mode
  const conflictResult = useMemo(() => {
    if (duration === 2) {
      return {
        hasConflict: false,
        canBook: true,
        errors: [],
        warnings: [],
        facultyAllocatedHours: 0,
        facultyMaxHours: 20,
      };
    }

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
        labId: undefined,
        classId: selectedTargetType !== 'class' ? classId : undefined,
      },
    });
  }, [
    duration,
    facultyId,
    subjectId,
    assignmentId,
    day,
    startSlot,
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

  // Validation and intra-batch conflict detection for 4-batch 2-hr lab mode
  const batchValidation = useMemo(() => {
    if (duration !== 2) {
      return { isValid: true, errors: [] as string[], warnings: [] as string[] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // At least A1 must have faculty and subject assigned
    if (!batches.A1.facultyId) {
      errors.push('A1 batch requires a Faculty Member to be selected.');
    }
    if (!batches.A1.subjectId) {
      errors.push('A1 batch requires a Subject to be selected.');
    }

    // Check for duplicate faculty assignment across batches in this 2hr slot
    const facultyBatchMap: Record<string, BatchKey[]> = {};
    BATCH_KEYS.forEach((bKey) => {
      const fId = batches[bKey].facultyId;
      if (fId) {
        if (!facultyBatchMap[fId]) facultyBatchMap[fId] = [];
        facultyBatchMap[fId].push(bKey);
      }
    });

    Object.entries(facultyBatchMap).forEach(([fId, assignedBatchKeys]) => {
      if (assignedBatchKeys.length > 1) {
        const facName = facultyList.find((f) => f.id === fId)?.name || 'Faculty';
        errors.push(`${facName} is assigned to multiple batches (${assignedBatchKeys.join(', ')}) simultaneously.`);
      }
    });

    // Check for duplicate lab assignment across batches in this 2hr slot
    const labBatchMap: Record<string, BatchKey[]> = {};
    BATCH_KEYS.forEach((bKey) => {
      const lId = batches[bKey].labId;
      if (lId) {
        if (!labBatchMap[lId]) labBatchMap[lId] = [];
        labBatchMap[lId].push(bKey);
      }
    });

    Object.entries(labBatchMap).forEach(([lId, assignedBatchKeys]) => {
      if (assignedBatchKeys.length > 1) {
        const labObj = labs.find((l) => l.id === lId);
        const lName = labObj?.name || 'Lab';
        errors.push(`${lName} is assigned to multiple batches (${assignedBatchKeys.join(', ')}) simultaneously.`);
      }
    });

    const isCanBook = errors.length === 0 && !!batches.A1.facultyId && !!batches.A1.subjectId;
    return { isValid: isCanBook, errors, warnings };
  }, [duration, batches, facultyList, labs]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);

    try {
      if (duration === 1) {
        if (!conflictResult.canBook) return;

        const payload = {
          day,
          startSlot,
          duration: 1 as const,
          targetType: selectedTargetType,
          targetId: selectedTargetId,
          facultyId,
          subjectId,
          roomId: selectedTargetType === 'class' ? roomId : undefined,
          classId: selectedTargetType !== 'class' ? classId : undefined,
          labBatches: undefined,
        };

        if (assignmentId) {
          await updateAssignment(assignmentId, payload);
        } else {
          await addAssignment(payload);
        }
      } else {
        // 2-hour 4-batch lab allocation (labs only, no lecture rooms)
        if (!batchValidation.isValid) return;

        const labBatches: LabBatch[] = BATCH_KEYS.map((bKey) => ({
          id: bKey,
          facultyId: batches[bKey].facultyId || batches.A1.facultyId,
          subjectId: batches[bKey].subjectId || batches.A1.subjectId,
          labId: batches[bKey].labId || undefined,
        }));

        const primaryFacultyId = batches.A1.facultyId || facultyList[0]?.id || '';
        const primarySubjectId = batches.A1.subjectId || subjectList[0]?.id || '';
        const primaryLabId = batches.A1.labId || undefined;

        const payload = {
          day,
          startSlot,
          duration: 2 as const,
          targetType: selectedTargetType,
          targetId: selectedTargetId,
          facultyId: primaryFacultyId,
          subjectId: primarySubjectId,
          roomId: undefined, // Labs have no lecture room
          labId: selectedTargetType === 'class' ? primaryLabId : undefined,
          classId: selectedTargetType !== 'class' ? classId : undefined,
          labBatches,
        };

        if (assignmentId) {
          await updateAssignment(assignmentId, payload);
        } else {
          await addAssignment(payload);
        }
      }

      toast.success(
        assignmentId ? 'Session Updated' : 'Session Scheduled',
        `${day} • Slot ${startSlot + 1} (${duration === 2 ? '2-Hour Lab' : 'Lecture'}) assigned successfully.`
      );
      closeSlotEditor();
    } catch (err: any) {
      const msg = err.message || 'Failed to save assignment. Is the backend running?';
      setSaveError(msg);
      toast.error('Schedule Action Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (assignmentId && confirm('Remove this scheduled session from the timetable?')) {
      setIsSaving(true);
      try {
        await deleteAssignment(assignmentId);
        toast.info('Session Removed', `${day} • Slot ${startSlot + 1} cleared from timetable.`);
        closeSlotEditor();
      } catch (err: any) {
        const msg = err.message || 'Failed to delete assignment.';
        setSaveError(msg);
        toast.error('Delete Failed', msg);
        setIsSaving(false);
      }
    }
  };

  const currentSlotObj = TIME_SLOTS[startSlot];
  const endSlotTime = duration === 2 ? TIME_SLOTS[startSlot + 1]?.end || '06:00' : currentSlotObj?.end;

  const isFormValid = !isSaving && (duration === 1 ? (!!facultyId && !!subjectId && conflictResult.canBook) : batchValidation.isValid);

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
      <form key={`${assignmentId || 'new'}-${day}-${startSlot}`} onSubmit={handleSubmit} className="space-y-6">
        {/* Slot Duration Selector */}
        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-2">
            Session Duration & Type
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
              <Clock className="w-4 h-4" />
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
              <FlaskConical className="w-4 h-4" />
              2 Hours (4-Batch Lab)
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* 2-HOUR LAB 4-BATCH ALLOCATION (A1, A2, A3, A4)              */}
        {/* ============================================================ */}
        {duration === 2 ? (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-1 border-b border-border">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-highlight" />
                <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                  4-Batch Allocation (A1, A2, A3, A4)
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground font-mono">
                2 Hr Practical Slot
              </span>
            </div>

            {/* If target is Lab/Room, which Class is attending */}
            {selectedTargetType !== 'class' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Attending Class / Student Group *
                  </label>
                </div>
                <Select value={classId} onValueChange={(val) => setClassId(val)}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Select Attending Class">
                      {classes.find((c) => c.id === classId)?.name}
                    </SelectValue>
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
                              Not available — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* 4 Batch Cards: A1, A2, A3, A4 */}
            {BATCH_KEYS.map((batchKey) => {
              const bData = batches[batchKey];
              const bSubjects = getBatchSubjects(bData.facultyId);
              const { badge, border, bg, title } = BATCH_COLORS[batchKey];

              return (
                <div
                  key={batchKey}
                  className={`p-3.5 rounded-xl border ${border} ${bg} space-y-3 transition-all`}
                >
                  {/* Batch Header */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md ${badge} shadow-xs font-mono`}>
                        {title}
                      </span>
                      <span className="text-xs font-semibold text-foreground">
                        {batchKey} Practical Section
                      </span>
                    </div>
                    {bData.facultyId && (
                      <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                        {facultyList.find((f) => f.id === bData.facultyId)?.name?.split(' ')[0]}
                      </span>
                    )}
                  </div>

                  {/* Faculty Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Faculty Member *
                      </label>
                      <span className="text-[10px] text-muted-foreground">Pre-filtered for availability</span>
                    </div>
                    <Select
                      value={bData.facultyId}
                      onValueChange={(val) => {
                        updateBatchField(batchKey, 'facultyId', val);
                        const newFac = facultyList.find((f) => f.id === val);
                        if (newFac && (!bData.subjectId || !newFac.subjectIds.includes(bData.subjectId))) {
                          updateBatchField(batchKey, 'subjectId', newFac.subjectIds[0] || bData.subjectId);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full text-xs bg-white">
                        <SelectValue placeholder="Select Faculty Member">
                          {facultyList.find((f) => f.id === bData.facultyId)?.name}
                        </SelectValue>
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
                                  Unavailable — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                                </div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Subject *
                      </label>
                      {bData.facultyId && (
                        <span className="text-[10px] text-primary font-medium">
                          {bSubjects.length} mapped
                        </span>
                      )}
                    </div>
                    <Select
                      value={bData.subjectId}
                      onValueChange={(val) => updateBatchField(batchKey, 'subjectId', val)}
                    >
                      <SelectTrigger className="w-full text-xs bg-white">
                        <SelectValue placeholder="Select Subject">
                          {(() => {
                            const s = subjectList.find((sub) => sub.id === bData.subjectId);
                            return s ? `${s.code} · ${s.name}` : undefined;
                          })()}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {bSubjects.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-[11px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                                {s.code}
                              </span>
                              <span className="font-medium">{s.name}</span>
                              <span className="text-muted-foreground text-[10px] ml-auto">{s.type.toUpperCase()}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Lab Facility */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] font-bold text-foreground uppercase tracking-wider">
                        Lab Facility *
                      </label>
                      <span className="text-[10px] text-muted-foreground">Real-time lab status</span>
                    </div>
                    <Select
                      value={bData.labId}
                      onValueChange={(val) => updateBatchField(batchKey, 'labId', val)}
                    >
                      <SelectTrigger className="w-full text-xs bg-white">
                        <SelectValue placeholder="Select Lab Facility">
                          {labs.find((l) => l.id === bData.labId)?.name}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {labAvailability.map(({ lab, isAvailable, conflictReason }) => (
                          <SelectItem key={lab.id} value={lab.id} disabled={!isAvailable}>
                            <div className="flex items-center gap-1.5">
                              <span className={isAvailable ? 'text-emerald-600 font-bold' : 'text-rose-500 font-bold'}>
                                {isAvailable ? '✓' : '✕'}
                              </span>
                              <span className="font-semibold text-xs">{lab.name}</span>
                              {!isAvailable && (
                                <span className="text-[10px] text-rose-500 ml-auto truncate max-w-[120px]">
                                  ({conflictReason})
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}

            {/* Batch Validation Error Alerts */}
            {batchValidation.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Please Resolve Batch Conflicts</span>
                </div>
                <ul className="text-xs text-rose-700 space-y-0.5 list-disc pl-5">
                  {batchValidation.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ) : (
          /* ============================================================ */
          /* 1-HOUR LECTURE STANDARD FORM                                 */
          /* ============================================================ */
          <div className="space-y-4">
            {/* Faculty Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                  Faculty Member *
                </label>
                <span className="text-xs text-muted-foreground">Pre-filtered for availability</span>
              </div>

              <Select
                value={facultyId}
                onValueChange={(val) => {
                  setFacultyId(val);
                  const newFac = facultyList.find((f) => f.id === val);
                  if (newFac && (!subjectId || !newFac.subjectIds.includes(subjectId))) {
                    setSubjectId(newFac.subjectIds[0] || availableSubjects[0]?.id || subjectId || '');
                  }
                }}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select Faculty Member">
                    {facultyList.find((f) => f.id === facultyId)?.name}
                  </SelectValue>
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
                            Not available — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
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
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
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
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Select Subject">
                    {(() => {
                      const s = subjectList.find((sub) => sub.id === subjectId);
                      return s ? `${s.code} · ${s.name}` : undefined;
                    })()}
                  </SelectValue>
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
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Lecture Room
                  </label>
                  <span className="text-xs text-muted-foreground">Real-time occupancy check</span>
                </div>
                <Select value={roomId} onValueChange={(val) => setRoomId(val)}>
                  <SelectTrigger className="w-full text-xs">
                    <SelectValue placeholder="Auto-selected or choose room">
                      {rooms.find((r) => r.id === roomId)?.name}
                    </SelectValue>
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
                              Not available — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* If target is Lab/Room, which Class is attending */}
            {selectedTargetType !== 'class' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                    Attending Student Group / Class *
                  </label>
                  <span className="text-xs text-muted-foreground">Class schedule check</span>
                </div>
                <Select value={classId} onValueChange={(val) => setClassId(val)}>
                  <SelectTrigger className="w-full text-xs">
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
                              Not available — {conflictReason}{conflictDetail ? ` (${conflictDetail})` : ''}
                            </div>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Conflict & Warning Banners for 1-hr */}
            {conflictResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Scheduling Conflict Detected</span>
                </div>
                <ul className="text-xs text-rose-700 space-y-0.5 list-disc pl-5">
                  {conflictResult.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* API Save Error */}
            {saveError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
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
          </div>
        )}

        {/* Form Action Controls */}
        <div className="pt-4 border-t border-border flex items-center justify-between gap-3 sticky bottom-0 bg-surface/95 backdrop-blur-xs py-2">
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
              disabled={!isFormValid || isSaving}
              className="gap-2"
            >
              {isSaving ? (
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {isSaving ? 'Saving...' : assignmentId ? 'Save Changes' : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
