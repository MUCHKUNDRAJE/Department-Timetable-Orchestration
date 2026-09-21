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
  Coffee,
} from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { TIME_SLOTS } from '@/lib/constants';
import { toast } from '@/lib/toast';
import { Drawer } from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { SearchableSelect } from '@/components/ui/SearchableSelect';
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
import { getFacultyInitials } from '@/lib/utils';
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

  // Form local state
  const [sessionType, setSessionType] = useState<'lecture' | 'lab' | 'recess'>('lecture');
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

    setIsSaving(false);
    setSaveError(null);

    if (assignmentId) {
      const existing = assignments.find((a) => a.id === assignmentId);
      if (existing) {
        if (existing.isRecess) {
          setSessionType('recess');
          setDuration(1);
          return;
        }

        if (existing.duration === 2) {
          setSessionType('lab');
        } else {
          setSessionType('lecture');
        }
        const targetClass = selectedTargetType === 'class' ? classes.find((c) => c.id === selectedTargetId) : undefined;
        const targetSemester = targetClass?.semester;

        const lectureSubjects = subjectList.filter(
          (s) => s.type === 'lecture' && (targetSemester ? s.semester === targetSemester : true)
        );
        const finalLectureSubjects = lectureSubjects.length > 0 ? lectureSubjects : subjectList;

        const effectiveSubjectId =
          existing.subjectId ||
          finalLectureSubjects[0]?.id ||
          subjectList[0]?.id ||
          '';
        const mappedFaculties = facultyList.filter((f) => f.subjectIds?.includes(effectiveSubjectId));
        const effectiveFacultyId =
          existing.facultyId ||
          mappedFaculties[0]?.id ||
          facultyList[0]?.id ||
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

    // 4. Smart Lecture Subject & Faculty Pre-population (Subject First)
    const lectureSubjects = subjectList.filter(
      (s) => s.type === 'lecture' && (targetSemester ? s.semester === targetSemester : true)
    );
    const applicableLectureSubjects =
      lectureSubjects.length > 0 ? lectureSubjects : subjectList.filter((s) => s.type === 'lecture');
    const finalLectureSubjects = applicableLectureSubjects.length > 0 ? applicableLectureSubjects : subjectList;

    const matchingSubj = finalLectureSubjects[0] || subjectList[0];

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

    const subjectFaculties = availableFaculties1hr.filter((f) =>
      f.subjectIds?.includes(matchingSubj?.id)
    );
    const fallbackSubjectFaculties = facultyList.filter((f) =>
      f.subjectIds?.includes(matchingSubj?.id)
    );
    const matchingFac =
      subjectFaculties[0] ||
      fallbackSubjectFaculties[0] ||
      availableFaculties1hr[0] ||
      facultyList[0];

    setSubjectId(matchingSubj?.id || '');
    setFacultyId(matchingFac?.id || '');

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

  // Available subjects for 1-hr lecture mode (prioritizing class semester)
  const availableSubjects = useMemo(() => {
    const targetClass = selectedTargetType === 'class' ? classes.find((c) => c.id === selectedTargetId) : undefined;
    const targetSemester = targetClass?.semester;

    const filteredByType = subjectList.filter((s) => (duration === 2 ? s.type === 'lab' : s.type === 'lecture'));
    const listToUse = filteredByType.length > 0 ? filteredByType : subjectList;

    if (targetSemester) {
      return [...listToUse].sort((a, b) => {
        if (a.semester === targetSemester && b.semester !== targetSemester) return -1;
        if (b.semester === targetSemester && a.semester !== targetSemester) return 1;
        return a.name.localeCompare(b.name);
      });
    }

    return listToUse;
  }, [subjectList, duration, selectedTargetType, selectedTargetId, classes]);

  // Faculties pre-filtered to those assigned/mapped to teach the selected subject
  const availableFaculties = useMemo(() => {
    if (!subjectId) return facultyAvailability;
    const mapped = facultyAvailability.filter((f) => f.faculty.subjectIds?.includes(subjectId));
    // Fallback to all faculties if none are officially mapped in the database
    return mapped.length > 0 ? mapped : facultyAvailability;
  }, [subjectId, facultyAvailability]);

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

  // Auto-switch duration, auto-assign mapped faculty, and auto-fill room when subject changes
  const handleSubjectChange = (newSubjectId: string) => {
    setSubjectId(newSubjectId);

    // Auto-assign faculty mapped to this subject if current faculty is invalid
    const mappedFacs = facultyAvailability.filter((fa) => fa.faculty.subjectIds?.includes(newSubjectId));
    const currentFacValid = mappedFacs.some((fa) => fa.faculty.id === facultyId);
    if (!currentFacValid && mappedFacs.length > 0) {
      const availableFac = mappedFacs.find((fa) => fa.isAvailable) || mappedFacs[0];
      setFacultyId(availableFac.faculty.id);
    }

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

  // Memoized options for SearchableSelect
  const facultyOptions = useMemo(() => {
    return availableFaculties.map(({ faculty, isAvailable, allocatedHours, maxHours, conflictReason, conflictDetail }) => ({
      value: faculty.id,
      label: faculty.name,
      code: faculty.nickname || getFacultyInitials(faculty),
      subLabel: faculty.designation,
      isAvailable,
      disabled: !isAvailable,
      disabledReason: conflictReason,
      disabledDetail: conflictDetail,
      badge: `${allocatedHours}/${maxHours}h`,
    }));
  }, [availableFaculties]);

  const subjectOptions = useMemo(() => {
    return availableSubjects.map((s) => ({
      value: s.id,
      label: s.name,
      code: s.code,
      badge: `${s.credits ?? 3}Cr`,
      subLabel: `${s.type.toUpperCase()}${s.department ? ` • ${s.department}` : ''}${s.semester ? ` • Sem ${s.semester}` : ''}`,
    }));
  }, [availableSubjects]);

  const roomOptions = useMemo(() => {
    return roomAvailability.map(({ room, isAvailable, conflictReason, conflictDetail }) => ({
      value: room.id,
      label: room.name,
      code: room.building || 'Room',
      subLabel: `${room.capacity} seats capacity`,
      isAvailable,
      disabled: !isAvailable,
      disabledReason: conflictReason,
      disabledDetail: conflictDetail,
      badge: `${room.capacity} Seats`,
    }));
  }, [roomAvailability]);

  const classOptions = useMemo(() => {
    return classAvailability.map(({ collegeClass: c, isAvailable, conflictReason, conflictDetail }) => ({
      value: c.id,
      label: c.name,
      code: `Sec ${c.section}`,
      subLabel: `${c.department} • Sem ${c.semester}`,
      isAvailable,
      disabled: !isAvailable,
      disabledReason: conflictReason,
      disabledDetail: conflictDetail,
      badge: `Sem ${c.semester}`,
    }));
  }, [classAvailability]);

  const labOptions = useMemo(() => {
    return labAvailability.map(({ lab, isAvailable, conflictReason }) => ({
      value: lab.id,
      label: lab.name,
      code: lab.location || 'Lab',
      subLabel: `${lab.capacity} workstations`,
      isAvailable,
      disabled: !isAvailable,
      disabledReason: conflictReason,
      badge: `${lab.capacity} Workstations`,
    }));
  }, [labAvailability]);

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
      if (sessionType === 'recess') {
        const payload = {
          day,
          startSlot,
          duration: 1 as const,
          targetType: selectedTargetType,
          targetId: selectedTargetId,
          facultyId: '',
          subjectId: '',
          roomId: undefined,
          classId: undefined,
          labBatches: undefined,
          isRecess: true,
        };

        if (assignmentId) {
          await updateAssignment(assignmentId, payload);
        } else {
          await addAssignment(payload);
        }

        toast.success(
          assignmentId ? 'Recess Updated' : 'Recess Scheduled',
          `${day} • Slot ${startSlot + 1} marked as Recess.`
        );
        setIsSaving(false);
        closeSlotEditor();
        return;
      }

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
          isRecess: false,
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
          isRecess: false,
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
      setIsSaving(false);
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
        setIsSaving(false);
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

  const isFormValid =
    !isSaving &&
    (sessionType === 'recess'
      ? true
      : duration === 1
      ? !!facultyId && !!subjectId && conflictResult.canBook
      : batchValidation.isValid);

  return (
    <Drawer
      isOpen={isOpen}
      onClose={closeSlotEditor}
      title={
        <div className="flex items-center gap-2">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
              sessionType === 'recess'
                ? 'bg-emerald-100 text-emerald-700'
                : duration === 2
                ? 'bg-highlight-light text-highlight'
                : 'bg-primary-light text-primary'
            }`}
          >
            {sessionType === 'recess' ? (
              <Coffee className="w-4 h-4" />
            ) : duration === 2 ? (
              <FlaskConical className="w-4 h-4" />
            ) : (
              <Clock className="w-4 h-4" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground">
              {assignmentId
                ? sessionType === 'recess'
                  ? 'Edit Recess Slot'
                  : 'Edit Scheduled Slot'
                : sessionType === 'recess'
                ? 'Assign Recess Break'
                : 'Assign Time Slot'}
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
        {/* Slot Duration & Type Single Line Nav */}
        <div>
          <label className="block text-sm font-bold text-foreground mb-2">
            Session Duration & Type
          </label>
          <div className="bg-surface-subtle border border-border p-1 rounded-xl flex items-center gap-1.5 w-full">
            <button
              type="button"
              onClick={() => {
                setSessionType('lecture');
                setDuration(1);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-bold transition-all truncate select-none ${
                sessionType === 'lecture'
                  ? 'bg-surface text-primary shadow-xs border border-primary/20 font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span className="truncate">1 Hr (Lecture)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSessionType('lab');
                setDuration(2);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-bold transition-all truncate select-none ${
                sessionType === 'lab'
                  ? 'bg-surface text-highlight shadow-xs border border-highlight/20 font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <FlaskConical className="w-4 h-4 shrink-0" />
              <span className="truncate">2 Hr (4B Lab)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setSessionType('recess');
                setDuration(1);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2 rounded-lg text-sm font-bold transition-all truncate select-none ${
                sessionType === 'recess'
                  ? 'bg-emerald-100/90 text-emerald-900 border border-emerald-400 shadow-xs font-black'
                  : 'text-muted-foreground hover:text-foreground hover:bg-surface/50'
              }`}
            >
              <Coffee className="w-4 h-4 shrink-0 text-emerald-600" />
              <span className="truncate">Recess</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* RECESS VIEW                                                  */}
        {/* ============================================================ */}
        {sessionType === 'recess' ? (
          <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-50 to-green-50/50 border-2 border-emerald-300 space-y-4 shadow-xs">
            <div className="flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
                <Coffee className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-extrabold text-emerald-950">Institutional Recess / Break</h4>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200/90 text-emerald-900 px-2 py-0.5 rounded-full border border-emerald-300">
                    1 Hour Break
                  </span>
                </div>
                <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                  Designates this time slot as a formal recess / lunch break for <strong>{currentTargetName}</strong>.
                  No faculty, subject, or laboratory bookings are required.
                </p>
              </div>
            </div>

            <div className="p-3 bg-white/90 rounded-xl border border-emerald-200 text-xs font-mono text-emerald-900 flex items-center justify-between">
              <span className="font-semibold">Scheduled Interval:</span>
              <span className="font-bold bg-emerald-100 text-emerald-950 px-2.5 py-1 rounded-md border border-emerald-200">
                {day} • {currentSlotObj?.start} — {currentSlotObj?.end}
              </span>
            </div>
          </div>
        ) : duration === 2 ? (
          /* ============================================================ */
          /* 2-HOUR LAB 4-BATCH ALLOCATION (A1, A2, A3, A4)              */
          /* ============================================================ */
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
                <SearchableSelect
                  value={classId}
                  onValueChange={(val) => setClassId(val)}
                  options={classOptions}
                  placeholder="Select Attending Class"
                  searchPlaceholder="Search class by name, section, or semester…"
                  emptyMessage="No classes found matching search."
                />
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
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        Faculty Member *
                      </label>
                      <span className="text-xs text-muted-foreground font-medium">Pre-filtered for availability</span>
                    </div>
                    <SearchableSelect
                      value={bData.facultyId}
                      onValueChange={(val) => {
                        updateBatchField(batchKey, 'facultyId', val);
                        const newFac = facultyList.find((f) => f.id === val);
                        if (newFac && (!bData.subjectId || !newFac.subjectIds.includes(bData.subjectId))) {
                          updateBatchField(batchKey, 'subjectId', newFac.subjectIds[0] || bData.subjectId);
                        }
                      }}
                      options={facultyOptions}
                      placeholder="Select Faculty Member"
                      searchPlaceholder="Search faculty by name, initials…"
                      emptyMessage="No faculty found."
                    />
                  </div>

                  {/* Subject Selection */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        Subject *
                      </label>
                      {bData.facultyId && (
                        <span className="text-xs text-primary font-semibold">
                          {bSubjects.length} mapped
                        </span>
                      )}
                    </div>
                    <SearchableSelect
                      value={bData.subjectId}
                      onValueChange={(val) => updateBatchField(batchKey, 'subjectId', val)}
                      options={bSubjects.map((s) => ({
                        value: s.id,
                        label: s.name,
                        code: s.code,
                        badge: `${s.credits ?? 2}Cr`,
                        subLabel: `${s.type.toUpperCase()}${s.semester ? ` • Sem ${s.semester}` : ''}`,
                      }))}
                      placeholder="Select Subject"
                      searchPlaceholder="Search batch subject by name or code…"
                      emptyMessage="No subjects mapped."
                    />
                  </div>

                  {/* Lab Facility */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-bold text-foreground">
                        Lab Facility *
                      </label>
                      <span className="text-xs text-muted-foreground font-medium">Real-time lab status</span>
                    </div>
                    <SearchableSelect
                      value={bData.labId}
                      onValueChange={(val) => updateBatchField(batchKey, 'labId', val)}
                      options={labOptions}
                      placeholder="Select Lab Facility"
                      searchPlaceholder="Search lab by name or location…"
                      emptyMessage="No labs found."
                    />
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
            {/* 1. Subject Select (Subject First) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-foreground">
                  Subject *
                </label>
                <span className="text-xs text-muted-foreground font-medium">Select subject first</span>
              </div>

              <SearchableSelect
                value={subjectId}
                onValueChange={(val) => handleSubjectChange(val)}
                options={subjectOptions}
                placeholder="Select Subject"
                searchPlaceholder="Search subject by code, name, or semester…"
                emptyMessage="No subjects found matching search."
              />
            </div>

            {/* 2. Faculty Select (Filtered by Subject) */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-bold text-foreground">
                  Faculty Member *
                </label>
                {subjectId && (
                  <span className="text-xs text-primary font-bold">
                    {availableFaculties.length} faculty assigned to this subject
                  </span>
                )}
              </div>

              <SearchableSelect
                value={facultyId}
                onValueChange={(val) => setFacultyId(val)}
                options={facultyOptions}
                placeholder="Select Faculty Member"
                searchPlaceholder="Search assigned faculty by name, initials, or designation…"
                emptyMessage="No faculty found assigned to this subject."
              />
            </div>

            {/* Location Assignment */}
            {selectedTargetType === 'class' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-foreground">
                    Lecture Room
                  </label>
                  <span className="text-xs text-muted-foreground font-medium">Real-time occupancy check</span>
                </div>
                <SearchableSelect
                  value={roomId}
                  onValueChange={(val) => setRoomId(val)}
                  options={roomOptions}
                  placeholder="Auto-selected or choose room"
                  searchPlaceholder="Search room by name or building…"
                  emptyMessage="No rooms found."
                />
              </div>
            )}

            {/* If target is Lab/Room, which Class is attending */}
            {selectedTargetType !== 'class' && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-bold text-foreground">
                    Attending Student Group / Class *
                  </label>
                  <span className="text-xs text-muted-foreground font-medium">Class schedule check</span>
                </div>
                <SearchableSelect
                  value={classId}
                  onValueChange={(val) => setClassId(val)}
                  options={classOptions}
                  placeholder="Select Attending Class"
                  searchPlaceholder="Search class by name, semester, or section…"
                  emptyMessage="No classes found."
                />
              </div>
            )}

            {/* Conflict & Warning Banners for 1-hr */}
            {conflictResult.errors.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
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
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-sm font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {facultyId && subjectId && conflictResult.canBook && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-sm font-medium">
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
              {isSaving
                ? 'Saving...'
                : sessionType === 'recess'
                ? assignmentId
                  ? 'Save Recess'
                  : 'Confirm Recess'
                : assignmentId
                ? 'Save Changes'
                : 'Confirm Assignment'}
            </Button>
          </div>
        </div>
      </form>
    </Drawer>
  );
}
