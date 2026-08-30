'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, User, MapPin, FlaskConical, Clock } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { DAYS, TIME_SLOTS } from '@/lib/constants';
import { Day, Assignment } from '@/types/timetable';
import { cn, getSubjectInitials, getFacultyInitials, getVenueDisplay } from '@/lib/utils';

export function ScheduleGrid() {
  const selectedTargetType = useTimetableStore((s) => s.selectedTargetType);
  const selectedTargetId = useTimetableStore((s) => s.selectedTargetId);
  const assignments = useTimetableStore((s) => s.assignments);
  const faculty = useTimetableStore((s) => s.faculty);
  const subjects = useTimetableStore((s) => s.subjects);
  const rooms = useTimetableStore((s) => s.rooms);
  const labs = useTimetableStore((s) => s.labs);
  const classes = useTimetableStore((s) => s.classes);
  const openSlotEditor = useTimetableStore((s) => s.openSlotEditor);

  // Filter assignments relevant to this selected target
  const relevantAssignments = assignments.filter((a) => {
    if (selectedTargetType === 'class') {
      return (a.targetType === 'class' && a.targetId === selectedTargetId) || a.classId === selectedTargetId;
    }
    if (selectedTargetType === 'lab') {
      return (a.targetType === 'lab' && a.targetId === selectedTargetId) || a.labId === selectedTargetId;
    }
    return (a.targetType === 'room' && a.targetId === selectedTargetId) || a.roomId === selectedTargetId;
  });

  // Helper to find assignment starting at a given day and slot
  const getAssignmentAt = (day: Day, slotId: number): Assignment | undefined => {
    return relevantAssignments.find((a) => a.day === day && a.startSlot === slotId);
  };

  // Helper to check if a slot is covered by a 2-hour lab that started at slotId - 1
  const isSlotCoveredByPreviousLab = (day: Day, slotId: number): boolean => {
    if (slotId === 0) return false;
    const prevAssignment = relevantAssignments.find(
      (a) => a.day === day && a.startSlot === slotId - 1 && a.duration === 2
    );
    return !!prevAssignment;
  };

  return (
    <div className="bg-surface border border-border rounded-2xl shadow-subtle overflow-hidden">
      {/* Horizontally scrollable container for responsiveness */}
      <div className="overflow-x-auto">
        <div className="min-w-[1080px]">
          {/* Header Row: Locked uniform columns for Day & 8 Time Slots */}
          <div className="grid grid-cols-[100px_repeat(8,minmax(120px,1fr))] bg-surface-subtle border-b border-border text-xs font-semibold text-muted-foreground">
            <div className="p-3 flex items-center justify-center border-r border-border font-bold uppercase tracking-wider text-[11px] text-foreground shrink-0">
              Day \ Time
            </div>
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className="p-2.5 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center gap-0.5 min-w-0 overflow-hidden"
              >
                <span className="font-mono text-foreground font-bold text-xs tracking-tight">
                  {slot.shortLabel}
                </span>
                <span className="text-[10px] text-muted tracking-tight truncate">
                  {slot.start} - {slot.end}
                </span>
              </div>
            ))}
          </div>

          {/* 6 Day Rows with strictly matching column templates */}
          {DAYS.map((day) => {
            return (
              <div
                key={day}
                className="grid grid-cols-[100px_repeat(8,minmax(120px,1fr))] border-b border-border last:border-b-0 min-h-[96px]"
              >
                {/* Day Header Column */}
                <div className="p-3 bg-surface-subtle/60 border-r border-border flex flex-col items-center justify-center gap-1 font-bold text-sm text-foreground shrink-0 select-none">
                  <span className="tracking-wide uppercase text-xs">{day}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>

                {/* 8 Uniform Slot Cells */}
                {TIME_SLOTS.map((slot) => {
                  const assignment = getAssignmentAt(day, slot.id);
                  const isCovered = isSlotCoveredByPreviousLab(day, slot.id);

                  // If covered by the prior slot's 2-hour duration, don't render a separate cell
                  if (isCovered) {
                    return null;
                  }

                  const isLab = assignment?.duration === 2;
                  const assignedFaculty = faculty.find((f) => f.id === assignment?.facultyId);
                  const assignedSubject = subjects.find((s) => s.id === assignment?.subjectId);
                  const assignedRoom = rooms.find((r) => r.id === assignment?.roomId);
                  const assignedLab = labs.find((l) => l.id === assignment?.labId);
                  const attendingClass = classes.find((c) => c.id === assignment?.classId);

                  if (assignment) {
                    const isBatchLab = isLab && assignment.labBatches && assignment.labBatches.length > 0;

                    if (isBatchLab && assignment.labBatches) {
                      const bA1 = assignment.labBatches.find((b) => b.id === 'A1');
                      const bA2 = assignment.labBatches.find((b) => b.id === 'A2');
                      const bA3 = assignment.labBatches.find((b) => b.id === 'A3');
                      const bA4 = assignment.labBatches.find((b) => b.id === 'A4');

                      const sA1 = subjects.find((s) => s.id === bA1?.subjectId);
                      const sA2 = subjects.find((s) => s.id === bA2?.subjectId);
                      const sA3 = subjects.find((s) => s.id === bA3?.subjectId);
                      const sA4 = subjects.find((s) => s.id === bA4?.subjectId);

                      const initA1 = sA1 ? getSubjectInitials(sA1) : 'LAB';
                      const initA2 = sA2 ? getSubjectInitials(sA2) : initA1;
                      const initA3 = sA3 ? getSubjectInitials(sA3) : initA1;
                      const initA4 = sA4 ? getSubjectInitials(sA4) : initA1;

                      const g1Subj = Array.from(new Set([initA1, initA2].filter(Boolean))).join('/');
                      const g2Subj = Array.from(new Set([initA3, initA4].filter(Boolean))).join('/');
                      const headerSubj = g1Subj === g2Subj ? g1Subj : `${g1Subj} / ${g2Subj}`;

                      const facA1 = getFacultyInitials(faculty.find((f) => f.id === bA1?.facultyId));
                      const facA2 = getFacultyInitials(faculty.find((f) => f.id === bA2?.facultyId));
                      const facA3 = getFacultyInitials(faculty.find((f) => f.id === bA3?.facultyId));
                      const facA4 = getFacultyInitials(faculty.find((f) => f.id === bA4?.facultyId));

                      const getCleanLabName = (labId?: string) => {
                        if (labId) {
                          const l = labs.find((item) => item.id === labId);
                          if (l) return l.name;
                        }
                        return 'Lab';
                      };

                      const labA1 = getCleanLabName(bA1?.labId);
                      const labA2 = getCleanLabName(bA2?.labId);
                      const labA3 = getCleanLabName(bA3?.labId);
                      const labA4 = getCleanLabName(bA4?.labId);

                      return (
                        <div
                          key={`${day}-${slot.id}`}
                          className="p-1.5 border-r border-border last:border-r-0 relative flex flex-col min-w-0 overflow-hidden col-span-2 bg-highlight-light/30"
                        >
                          <motion.div
                            whileHover={{ scale: 1.01, y: -1 }}
                            transition={{ duration: 0.15 }}
                            onClick={() => openSlotEditor(day, slot.id, assignment.duration, assignment.id)}
                            title={`4-Batch Practical Slot | A1[${facA1}], A2[${facA2}], A3[${facA3}], A4[${facA4}] | Labs: ${labA1}, ${labA2}, ${labA3}, ${labA4}`}
                            className="w-full h-[84px] min-h-[84px] max-h-[84px] rounded-xl p-2 flex flex-col justify-between cursor-pointer border transition-all duration-150 relative group min-w-0 overflow-hidden select-none bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-indigo-500/15 border-highlight/50 hover:border-highlight hover:shadow-card"
                          >
                            {/* Top Row: LAB - Subject Initials + Time */}
                            <div className="flex items-center justify-between gap-1 min-w-0">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="font-mono text-[11px] font-black px-1.5 py-0.5 rounded tracking-wider shadow-xs shrink-0 bg-highlight text-white uppercase">
                                  LAB - {headerSubj}
                                </span>
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-highlight bg-highlight/15 px-1 py-0.5 rounded shrink-0">
                                  4 Batches
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-muted flex items-center gap-0.5 opacity-70 group-hover:opacity-100 shrink-0">
                                <Clock className="w-2.5 h-2.5" />
                                {TIME_SLOTS[slot.id]?.shortLabel}
                              </span>
                            </div>

                            {/* Middle Row: A1[faculty], A2[faculty] / A3[faculty], A4[faculty] */}
                            <div className="my-auto flex items-center justify-between gap-1 font-mono text-[10px] font-bold text-foreground min-w-0">
                              <div className="flex items-center gap-1 text-primary truncate tracking-tight">
                                <User className="w-3 h-3 shrink-0 opacity-80" />
                                <span className="truncate">
                                  A1[{facA1}], A2[{facA2}] <span className="text-muted-foreground font-normal">/</span> A3[{facA3}], A4[{facA4}]
                                </span>
                              </div>
                            </div>

                            {/* Bottom Row: Labs Only */}
                            <div className="flex items-center justify-between text-[9.5px] text-muted-foreground font-mono border-t border-border/60 pt-0.5 min-w-0">
                              <div className="flex items-center gap-1 truncate">
                                <FlaskConical className="w-2.5 h-2.5 shrink-0 text-highlight" />
                                <span className="truncate font-semibold text-foreground">
                                  {labA1}, {labA2} <span className="text-muted font-normal">/</span> {labA3}, {labA4}
                                </span>
                              </div>
                              {selectedTargetType !== 'class' && attendingClass && (
                                <span className="text-primary font-bold truncate max-w-[65px] ml-auto">
                                  {attendingClass.name.split(' ')[0]}
                                </span>
                              )}
                            </div>
                          </motion.div>
                        </div>
                      );
                    }

                    const subjectInitials = getSubjectInitials(assignedSubject);
                    const facultyInitials = getFacultyInitials(assignedFaculty);
                    const venueDisplay = isLab
                      ? (assignedLab ? getVenueDisplay(undefined, assignedLab) : 'Lab')
                      : getVenueDisplay(assignedRoom, assignedLab);

                    return (
                      <div
                        key={`${day}-${slot.id}`}
                        className={cn(
                          'p-1.5 border-r border-border last:border-r-0 relative flex flex-col min-w-0 overflow-hidden',
                          isLab ? 'col-span-2 bg-highlight-light/30' : 'col-span-1 bg-surface'
                        )}
                      >
                        <motion.div
                          whileHover={{ scale: 1.02, y: -1 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => openSlotEditor(day, slot.id, assignment.duration, assignment.id)}
                          title={`${assignedSubject?.name} (${assignedSubject?.code}) | Faculty: ${assignedFaculty?.name || 'Unassigned'} | Venue: ${assignedLab?.name || assignedRoom?.name || 'Classroom'}`}
                          className={cn(
                            'w-full h-[84px] min-h-[84px] max-h-[84px] rounded-xl p-2 flex flex-col justify-between cursor-pointer border transition-all duration-150 relative group min-w-0 overflow-hidden select-none',
                            isLab
                              ? 'bg-gradient-to-r from-pink-500/15 via-purple-500/10 to-indigo-500/15 border-highlight/50 hover:border-highlight hover:shadow-card'
                              : 'bg-primary-light/50 border-primary/25 hover:border-primary/70 hover:shadow-card'
                          )}
                        >
                          {/* Top Row: Subject initials + Lab indicator + Time */}
                          <div className="flex items-center justify-between gap-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                className={cn(
                                  'font-mono text-xs font-black px-1.5 py-0.5 rounded tracking-wider shadow-xs shrink-0',
                                  isLab ? 'bg-highlight text-white' : 'bg-primary text-white'
                                )}
                              >
                                {subjectInitials}
                              </span>
                              {isLab && (
                                <span className="text-[9px] font-extrabold uppercase tracking-wider text-highlight bg-highlight/15 px-1 py-0.2 rounded shrink-0">
                                  2h
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted flex items-center gap-0.5 opacity-70 group-hover:opacity-100 shrink-0">
                              <Clock className="w-2.5 h-2.5" />
                              {TIME_SLOTS[slot.id]?.shortLabel}
                            </span>
                          </div>

                          {/* Middle Row: Faculty Initials + Room No */}
                          <div className="my-auto flex items-center justify-between gap-1 font-mono text-[11px] font-bold text-foreground min-w-0">
                            <div className="flex items-center gap-1 text-primary truncate">
                              <User className="w-3 h-3 shrink-0 opacity-80" />
                              <span className="truncate">{facultyInitials}</span>
                            </div>

                            <div className="flex items-center gap-0.5 text-muted-foreground truncate text-[10px]">
                              <MapPin className="w-2.5 h-2.5 shrink-0 text-muted" />
                              <span className="truncate font-semibold">{venueDisplay}</span>
                            </div>
                          </div>

                          {/* Bottom Row: Full Subject Code & Class info */}
                          <div className="flex items-center justify-between text-[9px] text-muted font-mono border-t border-border/60 pt-0.5 min-w-0">
                            <span className="truncate">{assignedSubject?.code || 'CODE'}</span>
                            {selectedTargetType !== 'class' && attendingClass && (
                              <span className="text-primary font-bold truncate max-w-[65px]">
                                {attendingClass.name.split(' ')[0]}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      </div>
                    );
                  }

                  // Empty Slot
                  const isLabTarget = selectedTargetType === 'lab';
                  return (
                    <div
                      key={`${day}-${slot.id}`}
                      className="p-1.5 border-r border-border last:border-r-0 col-span-1 min-w-0 overflow-hidden"
                    >
                      <button
                        onClick={() => openSlotEditor(day, slot.id, isLabTarget ? 2 : 1)}
                        className="w-full h-[84px] min-h-[84px] max-h-[84px] rounded-xl border border-dashed border-border hover:border-accent hover:bg-accent-light/30 transition-all flex flex-col items-center justify-center text-muted hover:text-primary gap-1 group slot-dashed-pattern min-w-0"
                      >
                        <div className="w-5 h-5 rounded-full bg-surface border border-border group-hover:border-accent group-hover:bg-primary group-hover:text-white flex items-center justify-center shadow-xs transition-colors">
                          <Plus className="w-3 h-3" />
                        </div>
                        <span className="text-[10px] font-medium opacity-60 group-hover:opacity-100 truncate max-w-[90%]">
                          {isLabTarget ? '+ 2h Lab' : '+ Add Slot'}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
