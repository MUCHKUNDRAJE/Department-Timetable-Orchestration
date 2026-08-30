'use client';

/**
 * store.ts — Zustand global state backed by the REST API.
 *
 * All mutation actions are async: they call the API first, then update
 * local Zustand state on success. This keeps the UI reactive while the
 * DB is the source of truth.
 *
 * hydrateFromApi() replaces hydrateFromStorage() and performs parallel
 * GET requests for all 6 resource collections.
 */

import { create } from 'zustand';
import {
  CollegeClass,
  Lab,
  Room,
  Faculty,
  Subject,
  Assignment,
  Day,
  TargetType,
} from '@/types/timetable';
import {
  classesApi,
  labsApi,
  roomsApi,
  facultyApi,
  subjectsApi,
  assignmentsApi,
  dataApi,
  FullState,
  ConflictCheckParams,
} from './api';
import { ConflictCheckResult } from '@/types/timetable';

export interface TimetableStore {
  // ─── State ─────────────────────────────────────────────────────────
  classes:     CollegeClass[];
  labs:        Lab[];
  rooms:       Room[];
  faculty:     Faculty[];
  subjects:    Subject[];
  assignments: Assignment[];
  isHydrated:  boolean;
  isFetching:  boolean;
  activeOperation: string | null;
  apiError:    string | null;

  // ─── Active Schedule Selection ──────────────────────────────────────
  selectedTargetType: TargetType;
  selectedTargetId:   string;
  setSelectedTarget: (type: TargetType, id: string) => void;

  // ─── Active Slot Editor UI State ────────────────────────────────────
  activeSlotEditor: {
    isOpen:       boolean;
    day:          Day;
    startSlot:    number;
    duration:     1 | 2;
    assignmentId?: string;
  } | null;
  openSlotEditor:  (day: Day, startSlot: number, duration?: 1 | 2, assignmentId?: string) => void;
  closeSlotEditor: () => void;

  // ─── Hydration ──────────────────────────────────────────────────────
  hydrateFromApi: () => Promise<void>;
  setFetching: (isFetching: boolean, operation?: string | null) => void;

  // ─── Assignments ────────────────────────────────────────────────────
  addAssignment:            (data: Omit<Assignment, 'id'>) => Promise<string>;
  updateAssignment:         (id: string, updates: Partial<Assignment>) => Promise<void>;
  deleteAssignment:         (id: string) => Promise<void>;
  clearAssignmentsForTarget:(targetType: TargetType, targetId: string) => Promise<void>;
  checkAssignmentConflict:  (params: ConflictCheckParams) => Promise<ConflictCheckResult>;

  // ─── Classes ────────────────────────────────────────────────────────
  addClass:    (item: Omit<CollegeClass, 'id'>) => Promise<string>;
  updateClass: (id: string, updates: Partial<CollegeClass>) => Promise<void>;
  deleteClass: (id: string) => Promise<void>;

  // ─── Labs ───────────────────────────────────────────────────────────
  addLab:    (item: Omit<Lab, 'id'>) => Promise<string>;
  updateLab: (id: string, updates: Partial<Lab>) => Promise<void>;
  deleteLab: (id: string) => Promise<void>;

  // ─── Rooms ──────────────────────────────────────────────────────────
  addRoom:    (item: Omit<Room, 'id'>) => Promise<string>;
  updateRoom: (id: string, updates: Partial<Room>) => Promise<void>;
  deleteRoom: (id: string) => Promise<void>;

  // ─── Faculty ────────────────────────────────────────────────────────
  addFaculty:    (item: Omit<Faculty, 'id'>) => Promise<string>;
  updateFaculty: (id: string, updates: Partial<Faculty>) => Promise<void>;
  deleteFaculty: (id: string) => Promise<void>;

  // ─── Subjects ───────────────────────────────────────────────────────
  addSubject:    (item: Omit<Subject, 'id'>) => Promise<string>;
  updateSubject: (id: string, updates: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;

  // ─── Backup / Import / Reset ────────────────────────────────────────
  resetToSeedData:  () => Promise<void>;
  importFullState:  (state: FullState) => Promise<void>;
  exportFullState:  () => Promise<FullState>;
}

export const useTimetableStore = create<TimetableStore>((set, get) => ({
  classes:     [],
  labs:        [],
  rooms:       [],
  faculty:     [],
  subjects:    [],
  assignments: [],
  isHydrated:  false,
  isFetching:  false,
  activeOperation: null,
  apiError:    null,

  selectedTargetType: 'class',
  selectedTargetId:   '',

  setSelectedTarget: (type, id) => set({ selectedTargetType: type, selectedTargetId: id }),

  activeSlotEditor: null,

  openSlotEditor: (day, startSlot, duration = 1, assignmentId) => {
    set({ activeSlotEditor: { isOpen: true, day, startSlot, duration, assignmentId } });
  },

  closeSlotEditor: () => set({ activeSlotEditor: null }),

  setFetching: (isFetching, activeOperation = null) => set({ isFetching, activeOperation }),

  // ─── Hydration ───────────────────────────────────────────────────────
  hydrateFromApi: async () => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('timetable_token');
      if (!token) {
        set({ isHydrated: true, isFetching: false, apiError: null });
        return;
      }
    }
    set({ isFetching: true, activeOperation: 'Syncing institutional data...' });
    try {
      const [classes, labs, rooms, faculty, subjects, assignments] = await Promise.all([
        classesApi.list(),
        labsApi.list(),
        roomsApi.list(),
        facultyApi.list(),
        subjectsApi.list(),
        assignmentsApi.list(),
      ]);
      set({
        classes,
        labs,
        rooms,
        faculty,
        subjects,
        assignments,
        isHydrated:         true,
        isFetching:         false,
        activeOperation:    null,
        apiError:           null,
        selectedTargetType: 'class',
        selectedTargetId:   classes[0]?.id || '',
      });
    } catch (err: any) {
      console.error('[Store] hydrateFromApi failed:', err.message);
      if (!err.message?.toLowerCase().includes('token') && !err.message?.toLowerCase().includes('auth')) {
        set({ isHydrated: true, isFetching: false, activeOperation: null, apiError: err.message });
      } else {
        set({ isHydrated: true, isFetching: false, activeOperation: null, apiError: null });
      }
    }
  },

  // ─── Assignments ─────────────────────────────────────────────────────
  addAssignment: async (data) => {
    const created = await assignmentsApi.create(data);
    set((s) => ({ assignments: [...s.assignments, created] }));
    return created.id;
  },

  updateAssignment: async (id, updates) => {
    const current = get().assignments.find((a) => a.id === id);
    if (!current) return;
    const updated = await assignmentsApi.update(id, { ...current, ...updates });
    set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? updated : a)) }));
  },

  deleteAssignment: async (id) => {
    await assignmentsApi.delete(id);
    set((s) => ({ assignments: s.assignments.filter((a) => a.id !== id) }));
  },

  clearAssignmentsForTarget: async (targetType, targetId) => {
    await assignmentsApi.clearForTarget(targetType, targetId);
    set((s) => ({
      assignments: s.assignments.filter(
        (a) => !(a.targetType === targetType && a.targetId === targetId)
      ),
    }));
  },

  checkAssignmentConflict: async (params) => {
    return assignmentsApi.checkConflict(params);
  },

  // ─── Classes ─────────────────────────────────────────────────────────
  addClass: async (item) => {
    const created = await classesApi.create(item);
    set((s) => ({ classes: [...s.classes, created] }));
    return created.id;
  },

  updateClass: async (id, updates) => {
    const current = get().classes.find((c) => c.id === id);
    if (!current) return;
    const updated = await classesApi.update(id, { ...current, ...updates });
    set((s) => ({ classes: s.classes.map((c) => (c.id === id ? updated : c)) }));
  },

  deleteClass: async (id) => {
    await classesApi.delete(id);
    set((s) => {
      const classes = s.classes.filter((c) => c.id !== id);
      return {
        classes,
        assignments: s.assignments.filter(
          (a) => !(a.targetType === 'class' && a.targetId === id) && a.classId !== id
        ),
        selectedTargetId:
          s.selectedTargetId === id ? (classes[0]?.id || '') : s.selectedTargetId,
      };
    });
  },

  // ─── Labs ────────────────────────────────────────────────────────────
  addLab: async (item) => {
    const created = await labsApi.create(item);
    set((s) => ({ labs: [...s.labs, created] }));
    return created.id;
  },

  updateLab: async (id, updates) => {
    const current = get().labs.find((l) => l.id === id);
    if (!current) return;
    const updated = await labsApi.update(id, { ...current, ...updates });
    set((s) => ({ labs: s.labs.map((l) => (l.id === id ? updated : l)) }));
  },

  deleteLab: async (id) => {
    await labsApi.delete(id);
    set((s) => ({
      labs: s.labs.filter((l) => l.id !== id),
      assignments: s.assignments.filter(
        (a) => !(a.targetType === 'lab' && a.targetId === id) && a.labId !== id
      ),
    }));
  },

  // ─── Rooms ───────────────────────────────────────────────────────────
  addRoom: async (item) => {
    const created = await roomsApi.create(item);
    set((s) => ({ rooms: [...s.rooms, created] }));
    return created.id;
  },

  updateRoom: async (id, updates) => {
    const current = get().rooms.find((r) => r.id === id);
    if (!current) return;
    const updated = await roomsApi.update(id, { ...current, ...updates });
    set((s) => ({ rooms: s.rooms.map((r) => (r.id === id ? updated : r)) }));
  },

  deleteRoom: async (id) => {
    await roomsApi.delete(id);
    set((s) => ({
      rooms: s.rooms.filter((r) => r.id !== id),
      assignments: s.assignments.filter(
        (a) => !(a.targetType === 'room' && a.targetId === id) && a.roomId !== id
      ),
    }));
  },

  // ─── Faculty ─────────────────────────────────────────────────────────
  addFaculty: async (item) => {
    const created = await facultyApi.create(item);
    set((s) => ({ faculty: [...s.faculty, created] }));
    return created.id;
  },

  updateFaculty: async (id, updates) => {
    const current = get().faculty.find((f) => f.id === id);
    if (!current) return;
    const updated = await facultyApi.update(id, { ...current, ...updates });
    set((s) => ({ faculty: s.faculty.map((f) => (f.id === id ? updated : f)) }));
  },

  deleteFaculty: async (id) => {
    await facultyApi.delete(id);
    set((s) => ({
      faculty:     s.faculty.filter((f) => f.id !== id),
      assignments: s.assignments.filter((a) => a.facultyId !== id),
    }));
  },

  // ─── Subjects ────────────────────────────────────────────────────────
  addSubject: async (item) => {
    const created = await subjectsApi.create(item);
    set((s) => ({ subjects: [...s.subjects, created] }));
    return created.id;
  },

  updateSubject: async (id, updates) => {
    const current = get().subjects.find((s) => s.id === id);
    if (!current) return;
    const updated = await subjectsApi.update(id, { ...current, ...updates });
    set((s) => ({ subjects: s.subjects.map((sub) => (sub.id === id ? updated : sub)) }));
  },

  deleteSubject: async (id) => {
    await subjectsApi.delete(id);
    set((s) => ({
      subjects:    s.subjects.filter((sub) => sub.id !== id),
      assignments: s.assignments.filter((a) => a.subjectId !== id),
      faculty:     s.faculty.map((f) => ({
        ...f,
        subjectIds: f.subjectIds.filter((sid) => sid !== id),
      })),
    }));
  },

  // ─── Reset / Import / Export ─────────────────────────────────────────
  resetToSeedData: async () => {
    await dataApi.reset();
    await get().hydrateFromApi();
  },

  importFullState: async (state) => {
    await dataApi.import(state);
    set({
      ...state,
      selectedTargetType: 'class',
      selectedTargetId:   state.classes[0]?.id || '',
    });
  },

  exportFullState: async () => {
    return dataApi.export();
  },
}));
