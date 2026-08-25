'use client';

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
  SEED_CLASSES,
  SEED_LABS,
  SEED_ROOMS,
  SEED_FACULTY,
  SEED_SUBJECTS,
  SEED_ASSIGNMENTS,
} from './seed-data';
import { generateId } from './utils';

const STORAGE_KEY = 'timetable_system_v1_store';

export interface TimetableStore {
  // State
  classes: CollegeClass[];
  labs: Lab[];
  rooms: Room[];
  faculty: Faculty[];
  subjects: Subject[];
  assignments: Assignment[];
  isHydrated: boolean;

  // Active Schedule Selection
  selectedTargetType: TargetType;
  selectedTargetId: string;
  setSelectedTarget: (type: TargetType, id: string) => void;

  // Active Slot Editor UI State
  activeSlotEditor: {
    isOpen: boolean;
    day: Day;
    startSlot: number;
    duration: 1 | 2;
    assignmentId?: string;
  } | null;
  openSlotEditor: (day: Day, startSlot: number, duration?: 1 | 2, assignmentId?: string) => void;
  closeSlotEditor: () => void;

  // Assignment Mutations
  addAssignment: (assignment: Omit<Assignment, 'id'>) => string;
  updateAssignment: (id: string, updates: Partial<Assignment>) => void;
  deleteAssignment: (id: string) => void;
  clearAssignmentsForTarget: (targetType: TargetType, targetId: string) => void;

  // Entity CRUD: Classes
  addClass: (item: Omit<CollegeClass, 'id'>) => string;
  updateClass: (id: string, updates: Partial<CollegeClass>) => void;
  deleteClass: (id: string) => void;

  // Entity CRUD: Labs
  addLab: (item: Omit<Lab, 'id'>) => string;
  updateLab: (id: string, updates: Partial<Lab>) => void;
  deleteLab: (id: string) => void;

  // Entity CRUD: Rooms
  addRoom: (item: Omit<Room, 'id'>) => string;
  updateRoom: (id: string, updates: Partial<Room>) => void;
  deleteRoom: (id: string) => void;

  // Entity CRUD: Faculty
  addFaculty: (item: Omit<Faculty, 'id'>) => string;
  updateFaculty: (id: string, updates: Partial<Faculty>) => void;
  deleteFaculty: (id: string) => void;

  // Entity CRUD: Subjects
  addSubject: (item: Omit<Subject, 'id'>) => string;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Backup, Import & Reset
  resetToSeedData: () => void;
  importFullState: (state: {
    classes: CollegeClass[];
    labs: Lab[];
    rooms: Room[];
    faculty: Faculty[];
    subjects: Subject[];
    assignments: Assignment[];
  }) => void;
  hydrateFromStorage: () => void;
}

export const useTimetableStore = create<TimetableStore>((set, get) => ({
  classes: SEED_CLASSES,
  labs: SEED_LABS,
  rooms: SEED_ROOMS,
  faculty: SEED_FACULTY,
  subjects: SEED_SUBJECTS,
  assignments: SEED_ASSIGNMENTS,
  isHydrated: false,

  selectedTargetType: 'class',
  selectedTargetId: SEED_CLASSES[0]?.id || '',

  setSelectedTarget: (type, id) => {
    set({ selectedTargetType: type, selectedTargetId: id });
  },

  activeSlotEditor: null,

  openSlotEditor: (day, startSlot, duration = 1, assignmentId) => {
    set({
      activeSlotEditor: {
        isOpen: true,
        day,
        startSlot,
        duration,
        assignmentId,
      },
    });
  },

  closeSlotEditor: () => {
    set({ activeSlotEditor: null });
  },

  addAssignment: (assignmentData) => {
    const id = generateId('asg');
    const newAssignment: Assignment = { ...assignmentData, id };
    set((state) => {
      const updated = [...state.assignments, newAssignment];
      persistState({ ...state, assignments: updated });
      return { assignments: updated };
    });
    return id;
  },

  updateAssignment: (id, updates) => {
    set((state) => {
      const updated = state.assignments.map((a) => (a.id === id ? { ...a, ...updates } : a));
      persistState({ ...state, assignments: updated });
      return { assignments: updated };
    });
  },

  deleteAssignment: (id) => {
    set((state) => {
      const updated = state.assignments.filter((a) => a.id !== id);
      persistState({ ...state, assignments: updated });
      return { assignments: updated };
    });
  },

  clearAssignmentsForTarget: (targetType, targetId) => {
    set((state) => {
      const updated = state.assignments.filter(
        (a) => !(a.targetType === targetType && a.targetId === targetId)
      );
      persistState({ ...state, assignments: updated });
      return { assignments: updated };
    });
  },

  // Classes
  addClass: (item) => {
    const id = generateId('class');
    set((state) => {
      const updated = [...state.classes, { ...item, id }];
      persistState({ ...state, classes: updated });
      return { classes: updated };
    });
    return id;
  },
  updateClass: (id, updates) => {
    set((state) => {
      const updated = state.classes.map((c) => (c.id === id ? { ...c, ...updates } : c));
      persistState({ ...state, classes: updated });
      return { classes: updated };
    });
  },
  deleteClass: (id) => {
    set((state) => {
      const updatedClasses = state.classes.filter((c) => c.id !== id);
      const updatedAssignments = state.assignments.filter(
        (a) => !(a.targetType === 'class' && a.targetId === id) && a.classId !== id
      );
      persistState({ ...state, classes: updatedClasses, assignments: updatedAssignments });
      return {
        classes: updatedClasses,
        assignments: updatedAssignments,
        selectedTargetId:
          state.selectedTargetId === id ? updatedClasses[0]?.id || '' : state.selectedTargetId,
      };
    });
  },

  // Labs
  addLab: (item) => {
    const id = generateId('lab');
    set((state) => {
      const updated = [...state.labs, { ...item, id }];
      persistState({ ...state, labs: updated });
      return { labs: updated };
    });
    return id;
  },
  updateLab: (id, updates) => {
    set((state) => {
      const updated = state.labs.map((l) => (l.id === id ? { ...l, ...updates } : l));
      persistState({ ...state, labs: updated });
      return { labs: updated };
    });
  },
  deleteLab: (id) => {
    set((state) => {
      const updatedLabs = state.labs.filter((l) => l.id !== id);
      const updatedAssignments = state.assignments.filter(
        (a) => !(a.targetType === 'lab' && a.targetId === id) && a.labId !== id
      );
      persistState({ ...state, labs: updatedLabs, assignments: updatedAssignments });
      return { labs: updatedLabs, assignments: updatedAssignments };
    });
  },

  // Rooms
  addRoom: (item) => {
    const id = generateId('room');
    set((state) => {
      const updated = [...state.rooms, { ...item, id }];
      persistState({ ...state, rooms: updated });
      return { rooms: updated };
    });
    return id;
  },
  updateRoom: (id, updates) => {
    set((state) => {
      const updated = state.rooms.map((r) => (r.id === id ? { ...r, ...updates } : r));
      persistState({ ...state, rooms: updated });
      return { rooms: updated };
    });
  },
  deleteRoom: (id) => {
    set((state) => {
      const updatedRooms = state.rooms.filter((r) => r.id !== id);
      const updatedAssignments = state.assignments.filter(
        (a) => !(a.targetType === 'room' && a.targetId === id) && a.roomId !== id
      );
      persistState({ ...state, rooms: updatedRooms, assignments: updatedAssignments });
      return { rooms: updatedRooms, assignments: updatedAssignments };
    });
  },

  // Faculty
  addFaculty: (item) => {
    const id = generateId('fac');
    set((state) => {
      const updated = [...state.faculty, { ...item, id }];
      persistState({ ...state, faculty: updated });
      return { faculty: updated };
    });
    return id;
  },
  updateFaculty: (id, updates) => {
    set((state) => {
      const updated = state.faculty.map((f) => (f.id === id ? { ...f, ...updates } : f));
      persistState({ ...state, faculty: updated });
      return { faculty: updated };
    });
  },
  deleteFaculty: (id) => {
    set((state) => {
      const updatedFaculty = state.faculty.filter((f) => f.id !== id);
      const updatedAssignments = state.assignments.filter((a) => a.facultyId !== id);
      persistState({ ...state, faculty: updatedFaculty, assignments: updatedAssignments });
      return { faculty: updatedFaculty, assignments: updatedAssignments };
    });
  },

  // Subjects
  addSubject: (item) => {
    const id = generateId('subj');
    set((state) => {
      const updated = [...state.subjects, { ...item, id }];
      persistState({ ...state, subjects: updated });
      return { subjects: updated };
    });
    return id;
  },
  updateSubject: (id, updates) => {
    set((state) => {
      const updated = state.subjects.map((s) => (s.id === id ? { ...s, ...updates } : s));
      persistState({ ...state, subjects: updated });
      return { subjects: updated };
    });
  },
  deleteSubject: (id) => {
    set((state) => {
      const updatedSubjects = state.subjects.filter((s) => s.id !== id);
      const updatedAssignments = state.assignments.filter((a) => a.subjectId !== id);
      const updatedFaculty = state.faculty.map((f) => ({
        ...f,
        subjectIds: f.subjectIds.filter((sid) => sid !== id),
      }));
      persistState({
        ...state,
        subjects: updatedSubjects,
        faculty: updatedFaculty,
        assignments: updatedAssignments,
      });
      return {
        subjects: updatedSubjects,
        faculty: updatedFaculty,
        assignments: updatedAssignments,
      };
    });
  },

  resetToSeedData: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    set({
      classes: SEED_CLASSES,
      labs: SEED_LABS,
      rooms: SEED_ROOMS,
      faculty: SEED_FACULTY,
      subjects: SEED_SUBJECTS,
      assignments: SEED_ASSIGNMENTS,
      selectedTargetType: 'class',
      selectedTargetId: SEED_CLASSES[0]?.id || '',
    });
  },

  importFullState: (newState) => {
    set({
      classes: newState.classes,
      labs: newState.labs,
      rooms: newState.rooms,
      faculty: newState.faculty,
      subjects: newState.subjects,
      assignments: newState.assignments,
      selectedTargetType: 'class',
      selectedTargetId: newState.classes[0]?.id || '',
    });
    persistState({
      ...get(),
      ...newState,
    });
  },

  hydrateFromStorage: () => {
    if (typeof window === 'undefined') return;
    try {
      const item = localStorage.getItem(STORAGE_KEY);
      if (item) {
        const parsed = JSON.parse(item);
        set({
          classes: parsed.classes || SEED_CLASSES,
          labs: parsed.labs || SEED_LABS,
          rooms: parsed.rooms || SEED_ROOMS,
          faculty: parsed.faculty || SEED_FACULTY,
          subjects: parsed.subjects || SEED_SUBJECTS,
          assignments: parsed.assignments || SEED_ASSIGNMENTS,
          isHydrated: true,
        });
      } else {
        set({ isHydrated: true });
      }
    } catch {
      set({ isHydrated: true });
    }
  },
}));

function persistState(state: {
  classes: CollegeClass[];
  labs: Lab[];
  rooms: Room[];
  faculty: Faculty[];
  subjects: Subject[];
  assignments: Assignment[];
}) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        classes: state.classes,
        labs: state.labs,
        rooms: state.rooms,
        faculty: state.faculty,
        subjects: state.subjects,
        assignments: state.assignments,
      })
    );
  } catch (err) {
    console.error('Failed to persist timetable store in localStorage', err);
  }
}
