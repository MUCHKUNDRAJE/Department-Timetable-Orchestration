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
  classTeacherId?: string; // ID of faculty assigned as Class Teacher
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
  abbreviation?: string; // Short code (e.g. DL, NLP, OT) for compact displays
  type: 'lecture' | 'lab';
  color: string;
  department: string;
  semester: number;
}

export interface Faculty {
  id: string;
  name: string;
  nickname?: string; // Optional short code / initials (e.g. KK, SV, VAP)
  department: string;
  designation: string; // Academic designation (e.g. Professor, Assistant Professor)
  roles?: string[]; // Special roles e.g. ['Timetable Incharge', 'Head of Department (HOD)']
  email: string;
  maxWeeklyHours: number; // default 20
  subjectIds: string[]; // subjects taught
}

export interface LabBatch {
  id: 'A1' | 'A2' | 'A3' | 'A4';
  facultyId: string;
  subjectId: string;
  labId?: string;
}

export interface Assignment {
  id: string;
  day: Day;
  startSlot: number; // 0 to 7 (e.g. 0 = 9-10)
  duration: 1 | 2; // 1 for regular lecture or recess, 2 for lab
  targetType: TargetType;
  targetId: string; // ID of Class, Lab, or Room being scheduled
  classId?: string; // If targetType is Lab/Room, which Class is attending
  facultyId?: string;
  subjectId?: string;
  roomId?: string; // Assigned physical room (if target is Class)
  labId?: string; // Assigned lab (if subject is Lab and target is Class)
  labBatches?: LabBatch[]; // 4-batch division (A1, A2, A3, A4) for 2hr lab sessions
  isRecess?: boolean; // True if this slot is a Recess / Break
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
