import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Subject } from '@/types/timetable';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Extracts clean faculty initials or nickname (e.g. "KK", "SV", "VAP")
 * If nickname is provided, returns it in uppercase.
 * If nickname is not provided, extracts capitalized initials from the full name.
 */
export function getFacultyInitials(
  nameOrFaculty?: string | { name?: string; nickname?: string } | null,
  optionalNickname?: string
): string {
  if (!nameOrFaculty) return 'FAC';

  let name = '';
  let nick = optionalNickname || '';

  if (typeof nameOrFaculty === 'object') {
    name = nameOrFaculty.name || '';
    nick = nameOrFaculty.nickname || nick;
  } else {
    name = nameOrFaculty;
  }

  // 1. If custom nickname exists, use it in uppercase
  if (nick && nick.trim().length > 0) {
    return nick.trim().toUpperCase();
  }

  if (!name || !name.trim()) return 'FAC';

  // 2. Fallback: generate clean capital initials from name
  const cleanName = name
    .replace(/\b(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.|Dr|Prof|Er\.|Er|Dean|HOD|Mam|Madam|Sir)\b/gi, '')
    .trim();

  const words = cleanName.split(/\s+/).filter((w) => w.length > 0 && !w.includes('.'));
  if (words.length === 0) return name.slice(0, 2).toUpperCase();
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

/**
 * Generates clean subject acronym / initials (e.g., "Cloud Computing Lab" -> "CC", "Optimum Theory" -> "OT")
 */
export function getSubjectInitials(
  subject?: Subject | { name: string; type?: string; code?: string },
  includeLabSuffix = false
): string {
  if (!subject) return 'SUBJ';
  const name = subject.name || '';
  const isLab = subject.type === 'lab' || name.toLowerCase().includes('lab');

  // Strip "Lab", "Laboratory", punctuation, and common connector words
  const baseName = name
    .replace(/\b(Lab|Laboratory|Practicals|Practical)\b/gi, '')
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .trim();

  const stopWords = new Set(['and', 'of', 'in', 'the', 'for', 'with', 'to', 'on', 'a', 'an']);
  const words = baseName.split(/\s+/).filter((w) => w.length > 0 && !stopWords.has(w.toLowerCase()));

  let acronym = '';
  if (words.length === 0) {
    acronym = subject.code ? subject.code.replace(/[^a-zA-Z]/g, '') || subject.code : 'SUB';
  } else if (words.length === 1) {
    acronym = words[0].slice(0, 3).toUpperCase();
  } else if (words.length <= 4) {
    acronym = words.map((w) => w[0].toUpperCase()).join('');
  } else {
    acronym = words.slice(0, 3).map((w) => w[0].toUpperCase()).join('');
  }

  return isLab && includeLabSuffix ? `${acronym} (Lab)` : acronym;
}

/**
 * Extracts clean full room/lab identifier (e.g., "EL-202", "EL-301", "EL-002")
 */
export function getVenueDisplay(room?: { name: string }, lab?: { name: string }): string {
  if (lab?.name) {
    const match = lab.name.match(/\(([^)]+)\)/);
    if (match) return match[1]; // e.g. "EL-002" from "AI & Robotics Lab (EL-002)"
    return lab.name.split(' ')[0];
  }
  if (room?.name) {
    const match = room.name.match(/^([A-Z0-9-]+)/i);
    return match ? match[1] : room.name; // e.g. "EL-301" from "EL-301 (Smart Lecture Hall)"
  }
  return 'Room';
}
