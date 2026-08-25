export type Day = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';

export interface TimeSlot {
  id: number;
  label: string;
  start: string;
  end: string;
  shortLabel: string;
}

export type TargetType = 'class' | 'lab' | 'room';

export interface CollegeClass {
  id: string;
  name: string; // e.g. "AIDS 7th Sem A"
  department: string;
  semester: number;
  section: string;
  studentCount?: number;
}

export interface Lab {
  id: string;
  name: string; // e.g. "AIDS Lab 2"
  capacity: number;
  department: string;
  location?: string;
}

export interface Room {
  id: string;
  name: string; // e.g. "EL-303"
  capacity: number;
  building: string;
  type?: 'lecture' | 'seminar' | 'auditorium';
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  type: 'lecture' | 'lab';
  color: string;
  department: string;
  semester: number;
}

export interface Faculty {
  id: string;
  name: string;
  department: string;
  designation: string;
  email: string;
  maxWeeklyHours: number; // default 20
  subjectIds: string[]; // subjects taught
}

export interface Assignment {
  id: string;
  day: Day;
  startSlot: number; // 0 to 7 (e.g. 0 = 9-10)
  duration: 1 | 2; // 1 for regular lecture, 2 for lab
  targetType: TargetType;
  targetId: string; // ID of Class, Lab, or Room being scheduled
  classId?: string; // If targetType is Lab/Room, which Class is attending
  facultyId: string;
  subjectId: string;
  roomId?: string; // Assigned physical room (if target is Class)
  labId?: string; // Assigned lab (if subject is Lab and target is Class)
}

export interface ConflictCheckResult {
  hasConflict: boolean;
  canBook: boolean;
  errors: string[];
  warnings: string[];
  facultyAllocatedHours: number;
  facultyMaxHours: number;
}

export type PrintMode = 'ug' | 'lab' | 'room' | 'faculty';
