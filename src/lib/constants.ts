import { Day, TimeSlot } from '@/types/timetable';

export const DAYS: Day[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const TIME_SLOTS: TimeSlot[] = [
  { id: 0, label: '09:00 AM - 10:00 AM', start: '09:00', end: '10:00', shortLabel: '9-10' },
  { id: 1, label: '10:00 AM - 11:00 AM', start: '10:00', end: '11:00', shortLabel: '10-11' },
  { id: 2, label: '11:00 AM - 12:00 PM', start: '11:00', end: '12:00', shortLabel: '11-12' },
  { id: 3, label: '12:00 PM - 01:00 PM', start: '12:00', end: '13:00', shortLabel: '12-1' },
  { id: 4, label: '01:00 PM - 02:00 PM', start: '13:00', end: '14:00', shortLabel: '1-2' },
  { id: 5, label: '02:00 PM - 03:00 PM', start: '14:00', end: '15:00', shortLabel: '2-3' },
  { id: 6, label: '03:00 PM - 04:00 PM', start: '15:00', end: '16:00', shortLabel: '3-4' },
  { id: 7, label: '04:00 PM - 05:00 PM', start: '16:00', end: '17:00', shortLabel: '4-5' },
];

export const SUBJECT_PALETTE = [
  { bg: 'bg-indigo-50 border-indigo-200 text-indigo-900', badge: 'bg-indigo-600 text-white', accent: '#5755FE' },
  { bg: 'bg-purple-50 border-purple-200 text-purple-900', badge: 'bg-purple-600 text-white', accent: '#8B93FF' },
  { bg: 'bg-pink-50 border-pink-200 text-pink-900', badge: 'bg-pink-500 text-white', accent: '#FF71CD' },
  { bg: 'bg-emerald-50 border-emerald-200 text-emerald-900', badge: 'bg-emerald-600 text-white', accent: '#10B981' },
  { bg: 'bg-sky-50 border-sky-200 text-sky-900', badge: 'bg-sky-600 text-white', accent: '#0284C7' },
  { bg: 'bg-amber-50 border-amber-200 text-amber-900', badge: 'bg-amber-600 text-white', accent: '#D97706' },
  { bg: 'bg-teal-50 border-teal-200 text-teal-900', badge: 'bg-teal-600 text-white', accent: '#0D9488' },
  { bg: 'bg-rose-50 border-rose-200 text-rose-900', badge: 'bg-rose-600 text-white', accent: '#E11D48' },
];

export const INSTITUTION_INFO = {
  collegeName: 'METROPOLITAN INSTITUTE OF TECHNOLOGY & SCIENCE',
  department: 'Department of Artificial Intelligence & Data Science',
  academicYear: '2026 - 2027 (Odd Semester)',
  effectiveDate: 'August 10, 2026',
  deanName: 'Dr. Sarah Vance, Ph.D.',
  hodName: 'Dr. Rajesh Raman, M.Tech, Ph.D.',
  coordinatorName: 'Prof. Ananya Sen, Timetable Chair',
};
