import { Assignment, CollegeClass, Day, Faculty, Lab, Room, Subject, ConflictCheckResult } from '@/types/timetable';
import { TIME_SLOTS } from './constants';

export interface CheckConflictParams {
  assignments: Assignment[];
  facultyList: Faculty[];
  classList: CollegeClass[];
  labList: Lab[];
  roomList: Room[];
  subjectList: Subject[];
  assignmentToValidate: {
    id?: string; // If editing existing
    day: Day;
    startSlot: number;
    duration: 1 | 2;
    targetType: 'class' | 'lab' | 'room';
    targetId: string;
    facultyId: string;
    subjectId: string;
    roomId?: string;
    labId?: string;
    classId?: string;
  };
}

/**
 * Calculates total weekly hours currently allocated to a faculty member.
 */
export function calculateFacultyAllocatedHours(
  facultyId: string,
  assignments: Assignment[],
  excludeAssignmentId?: string
): number {
  return assignments
    .filter((a) => a.facultyId === facultyId && a.id !== excludeAssignmentId)
    .reduce((sum, a) => sum + (a.duration || 1), 0);
}

/**
 * Returns whether a given slot interval [startSlot, startSlot + duration - 1] overlaps with an assignment
 */
export function isSlotOverlapping(
  slotA: number,
  durationA: number,
  slotB: number,
  durationB: number
): boolean {
  const startA = slotA;
  const endA = slotA + durationA;
  const startB = slotB;
  const endB = slotB + durationB;
  return Math.max(startA, startB) < Math.min(endA, endB);
}

/**
 * Comprehensive Conflict Detection Engine
 */
export function checkAssignmentConflict(params: CheckConflictParams): ConflictCheckResult {
  const {
    assignments,
    facultyList,
    classList,
    labList,
    roomList,
    subjectList,
    assignmentToValidate: item,
  } = params;

  const errors: string[] = [];
  const warnings: string[] = [];

  const faculty = facultyList.find((f) => f.id === item.facultyId);
  const subject = subjectList.find((s) => s.id === item.subjectId);
  const slotInfo = TIME_SLOTS[item.startSlot];

  // 1. Boundary Check: A 2-hour lab cannot start at the final slot (slot 7: 4-5 PM)
  if (item.duration === 2 && item.startSlot >= 7) {
    errors.push('A 2-hour Lab cannot be scheduled in the last slot (4:00 PM - 5:00 PM) as it extends beyond institutional working hours.');
  }

  // 2. Faculty Teaching Capability Check: Can this faculty teach this subject?
  if (faculty && subject && !faculty.subjectIds.includes(subject.id)) {
    warnings.push(`${faculty.name} is not officially mapped to teach ${subject.code} (${subject.name}).`);
  }

  // 3. Faculty Max Weekly Hours Check
  const maxWeeklyHours = faculty?.maxWeeklyHours ?? 20;
  const currentHours = faculty ? calculateFacultyAllocatedHours(faculty.id, assignments, item.id) : 0;
  const projectedHours = currentHours + item.duration;

  if (faculty && projectedHours > maxWeeklyHours) {
    errors.push(
      `Weekly Hours Limit Exceeded: ${faculty.name} has currently allocated ${currentHours}/${maxWeeklyHours} hrs. Adding this ${item.duration}-hour slot would result in ${projectedHours} hrs (exceeding maximum allowance by ${projectedHours - maxWeeklyHours} hr).`
    );
  }

  // Filter other assignments on the same day (excluding the one being edited)
  const otherAssignmentsSameDay = assignments.filter(
    (a) => a.day === item.day && a.id !== item.id
  );

  for (const existing of otherAssignmentsSameDay) {
    const overlaps = isSlotOverlapping(
      item.startSlot,
      item.duration,
      existing.startSlot,
      existing.duration
    );

    if (!overlaps) continue;

    const existingFaculty = facultyList.find((f) => f.id === existing.facultyId);
    const existingSubject = subjectList.find((s) => s.id === existing.subjectId);
    const existingClass = classList.find((c) => c.id === (existing.targetType === 'class' ? existing.targetId : existing.classId));
    const existingRoom = roomList.find((r) => r.id === (existing.targetType === 'room' ? existing.targetId : existing.roomId));
    const existingLab = labList.find((l) => l.id === (existing.targetType === 'lab' ? existing.targetId : existing.labId));

    const existingTimeDesc = `${TIME_SLOTS[existing.startSlot]?.shortLabel ?? existing.startSlot}`;

    // 4. Double Booking Check for Faculty
    if (item.facultyId && existing.facultyId === item.facultyId) {
      const targetDesc = existingClass?.name || existingRoom?.name || existingLab?.name || 'another session';
      errors.push(
        `Faculty Double-Booking: ${faculty?.name || 'Selected Faculty'} is already scheduled for ${existingSubject?.code || 'a session'} with ${targetDesc} at ${item.day} (${existingTimeDesc}).`
      );
    }

    // 5. Target Entity Conflict Check (Class / Lab / Room being scheduled)
    if (item.targetType === existing.targetType && item.targetId === existing.targetId) {
      const entityName =
        item.targetType === 'class'
          ? classList.find((c) => c.id === item.targetId)?.name
          : item.targetType === 'lab'
          ? labList.find((l) => l.id === item.targetId)?.name
          : roomList.find((r) => r.id === item.targetId)?.name;

      errors.push(
        `Target Busy: ${entityName || 'This entity'} already has an active session (${existingSubject?.code} with ${existingFaculty?.name || 'Faculty'}) during this time on ${item.day}.`
      );
    }

    // 6. Cross-Entity Room Conflict (If this lecture assigns a physical room)
    if (item.roomId && (existing.roomId === item.roomId || (existing.targetType === 'room' && existing.targetId === item.roomId))) {
      const room = roomList.find((r) => r.id === item.roomId);
      errors.push(
        `Room Collision: Room ${room?.name || item.roomId} is already occupied by ${existingClass?.name || 'another group'} (${existingSubject?.code}) at this time.`
      );
    }

    // 7. Cross-Entity Lab Conflict (If this class lab assigns a physical lab)
    if (item.labId && (existing.labId === item.labId || (existing.targetType === 'lab' && existing.targetId === item.labId))) {
      const lab = labList.find((l) => l.id === item.labId);
      errors.push(
        `Lab Collision: ${lab?.name || item.labId} is already reserved by ${existingClass?.name || 'another group'} at this time.`
      );
    }
  }

  return {
    hasConflict: errors.length > 0,
    canBook: errors.length === 0,
    errors,
    warnings,
    facultyAllocatedHours: currentHours,
    facultyMaxHours: maxWeeklyHours,
  };
}

/**
 * Returns available faculty list with real-time conflict status for a specific slot.
 */
export function getFacultyAvailabilityForSlot(
  day: Day,
  startSlot: number,
  duration: 1 | 2,
  assignments: Assignment[],
  facultyList: Faculty[],
  excludeAssignmentId?: string,
  subjectList: Subject[] = [],
  classList: CollegeClass[] = [],
  labList: Lab[] = [],
  roomList: Room[] = []
) {
  return facultyList.map((faculty) => {
    const allocatedHours = calculateFacultyAllocatedHours(faculty.id, assignments, excludeAssignmentId);
    const wouldExceedHours = allocatedHours + duration > faculty.maxWeeklyHours;

    // Check if double-booked
    const conflictingAssignment = assignments.find((a) => {
      if (a.id === excludeAssignmentId) return false;
      if (a.day !== day) return false;
      if (a.facultyId !== faculty.id) return false;
      return isSlotOverlapping(startSlot, duration, a.startSlot, a.duration);
    });

    const isAvailable = !conflictingAssignment && !wouldExceedHours;

    let conflictReason = '';
    let conflictDetail = '';

    if (conflictingAssignment) {
      const slotLabel = TIME_SLOTS[conflictingAssignment.startSlot]?.shortLabel ?? '';
      const subjName = subjectList.find((s) => s.id === conflictingAssignment.subjectId)?.name || 'a session';
      const subjCode = subjectList.find((s) => s.id === conflictingAssignment.subjectId)?.code || '';

      // Determine class name
      let className = '';
      if (conflictingAssignment.targetType === 'class') {
        className = classList.find((c) => c.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.classId) {
        className = classList.find((c) => c.id === conflictingAssignment.classId)?.name || '';
      }

      // Determine venue
      let venueName = '';
      if (conflictingAssignment.targetType === 'lab') {
        venueName = labList.find((l) => l.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.targetType === 'room') {
        venueName = roomList.find((r) => r.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.labId) {
        venueName = labList.find((l) => l.id === conflictingAssignment.labId)?.name || '';
      } else if (conflictingAssignment.roomId) {
        venueName = roomList.find((r) => r.id === conflictingAssignment.roomId)?.name || '';
      }

      conflictReason = `Busy at ${slotLabel}`;
      const parts = [];
      if (subjCode) parts.push(subjCode);
      if (className) parts.push(className);
      if (venueName) parts.push(venueName);
      conflictDetail = parts.join(' · ');
    } else if (wouldExceedHours) {
      conflictReason = `Max hours reached (${allocatedHours}/${faculty.maxWeeklyHours}h)`;
      conflictDetail = '';
    }

    return {
      faculty,
      isAvailable,
      allocatedHours,
      maxHours: faculty.maxWeeklyHours,
      conflictReason,
      conflictDetail,
      conflictingAssignment,
    };
  });
}

/**
 * Returns available room list with real-time conflict status for a specific slot.
 */
export function getRoomAvailabilityForSlot(
  day: Day,
  startSlot: number,
  duration: 1 | 2,
  assignments: Assignment[],
  roomList: Room[],
  excludeAssignmentId?: string,
  subjectList: Subject[] = [],
  classList: CollegeClass[] = [],
  facultyList: Faculty[] = []
) {
  return roomList.map((room) => {
    // Find if any assignment on this day & slot is using this room
    const conflictingAssignment = assignments.find((a) => {
      if (a.id === excludeAssignmentId) return false;
      if (a.day !== day) return false;
      
      const isThisRoomUsed =
        (a.targetType === 'room' && a.targetId === room.id) || a.roomId === room.id;
      
      if (!isThisRoomUsed) return false;
      return isSlotOverlapping(startSlot, duration, a.startSlot, a.duration);
    });

    const isAvailable = !conflictingAssignment;
    let conflictReason = '';
    let conflictDetail = '';

    if (conflictingAssignment) {
      const slotLabel = TIME_SLOTS[conflictingAssignment.startSlot]?.shortLabel ?? '';
      const subj = subjectList.find((s) => s.id === conflictingAssignment.subjectId);
      const fac = facultyList.find((f) => f.id === conflictingAssignment.facultyId);
      
      let className = '';
      if (conflictingAssignment.targetType === 'class') {
        className = classList.find((c) => c.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.classId) {
        className = classList.find((c) => c.id === conflictingAssignment.classId)?.name || '';
      }

      conflictReason = `In use at ${slotLabel}`;
      const parts = [];
      if (subj?.code) parts.push(subj.code);
      if (className) parts.push(className);
      if (fac?.name) parts.push(`(${fac.name})`);
      conflictDetail = parts.join(' · ');
    }

    return {
      room,
      isAvailable,
      conflictReason,
      conflictDetail,
      conflictingAssignment,
    };
  });
}

/**
 * Returns available lab list with real-time conflict status for a specific slot.
 */
export function getLabAvailabilityForSlot(
  day: Day,
  startSlot: number,
  duration: 1 | 2,
  assignments: Assignment[],
  labList: Lab[],
  excludeAssignmentId?: string,
  subjectList: Subject[] = [],
  classList: CollegeClass[] = [],
  facultyList: Faculty[] = []
) {
  return labList.map((lab) => {
    // Find if any assignment on this day & slot is using this lab
    const conflictingAssignment = assignments.find((a) => {
      if (a.id === excludeAssignmentId) return false;
      if (a.day !== day) return false;
      
      const isThisLabUsed =
        (a.targetType === 'lab' && a.targetId === lab.id) || a.labId === lab.id;
      
      if (!isThisLabUsed) return false;
      return isSlotOverlapping(startSlot, duration, a.startSlot, a.duration);
    });

    const isAvailable = !conflictingAssignment;
    let conflictReason = '';
    let conflictDetail = '';

    if (conflictingAssignment) {
      const slotLabel = TIME_SLOTS[conflictingAssignment.startSlot]?.shortLabel ?? '';
      const subj = subjectList.find((s) => s.id === conflictingAssignment.subjectId);
      const fac = facultyList.find((f) => f.id === conflictingAssignment.facultyId);
      
      let className = '';
      if (conflictingAssignment.targetType === 'class') {
        className = classList.find((c) => c.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.classId) {
        className = classList.find((c) => c.id === conflictingAssignment.classId)?.name || '';
      }

      conflictReason = `In use at ${slotLabel}`;
      const parts = [];
      if (subj?.code) parts.push(subj.code);
      if (className) parts.push(className);
      if (fac?.name) parts.push(`(${fac.name})`);
      conflictDetail = parts.join(' · ');
    }

    return {
      lab,
      isAvailable,
      conflictReason,
      conflictDetail,
      conflictingAssignment,
    };
  });
}

/**
 * Returns available class list with real-time conflict status for a specific slot.
 */
export function getClassAvailabilityForSlot(
  day: Day,
  startSlot: number,
  duration: 1 | 2,
  assignments: Assignment[],
  classList: CollegeClass[],
  excludeAssignmentId?: string,
  subjectList: Subject[] = [],
  labList: Lab[] = [],
  roomList: Room[] = []
) {
  return classList.map((cls) => {
    const conflictingAssignment = assignments.find((a) => {
      if (a.id === excludeAssignmentId) return false;
      if (a.day !== day) return false;

      const isThisClassInvolved =
        (a.targetType === 'class' && a.targetId === cls.id) || a.classId === cls.id;

      if (!isThisClassInvolved) return false;
      return isSlotOverlapping(startSlot, duration, a.startSlot, a.duration);
    });

    const isAvailable = !conflictingAssignment;
    let conflictReason = '';
    let conflictDetail = '';

    if (conflictingAssignment) {
      const slotLabel = TIME_SLOTS[conflictingAssignment.startSlot]?.shortLabel ?? '';
      const subj = subjectList.find((s) => s.id === conflictingAssignment.subjectId);
      
      let venueName = '';
      if (conflictingAssignment.targetType === 'lab') {
        venueName = labList.find((l) => l.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.targetType === 'room') {
        venueName = roomList.find((r) => r.id === conflictingAssignment.targetId)?.name || '';
      } else if (conflictingAssignment.labId) {
        venueName = labList.find((l) => l.id === conflictingAssignment.labId)?.name || '';
      } else if (conflictingAssignment.roomId) {
        venueName = roomList.find((r) => r.id === conflictingAssignment.roomId)?.name || '';
      }

      conflictReason = `Busy at ${slotLabel}`;
      const parts = [];
      if (subj?.code) parts.push(subj.code);
      if (venueName) parts.push(venueName);
      conflictDetail = parts.join(' · ');
    }

    return {
      collegeClass: cls,
      isAvailable,
      conflictReason,
      conflictDetail,
      conflictingAssignment,
    };
  });
}
