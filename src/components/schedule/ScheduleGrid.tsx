'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Plus, User, MapPin, FlaskConical, Clock } from 'lucide-react';
import { useTimetableStore } from '@/lib/store';
import { DAYS, TIME_SLOTS } from '@/lib/constants';
import { Day, Assignment } from '@/types/timetable';
import { cn } from '@/lib/utils';

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
        <div className="min-w-[960px]">
          {/* Header Row: Days & 8 Time Slots */}
          <div className="grid grid-cols-[100px_repeat(8,1fr)] bg-surface-subtle border-b border-border text-xs font-semibold text-muted-foreground">
            <div className="p-3.5 flex items-center justify-center border-r border-border font-bold uppercase tracking-wider text-[11px] text-foreground">
              Day \ Time
            </div>
            {TIME_SLOTS.map((slot) => (
              <div
                key={slot.id}
                className="p-3 text-center border-r border-border last:border-r-0 flex flex-col items-center justify-center gap-0.5"
              >
                <span className="font-mono text-foreground font-bold text-xs">{slot.shortLabel}</span>
                <span className="text-[10px] text-muted tracking-tight">{slot.start} - {slot.end}</span>
              </div>
            ))}
          </div>

          {/* 6 Day Rows */}
          {DAYS.map((day) => {
            return (
              <div
                key={day}
                className="grid grid-cols-[100px_repeat(8,1fr)] border-b border-border last:border-b-0 min-h-[96px]"
              >
                {/* Day Header Column */}
                <div className="p-3.5 bg-surface-subtle/60 border-r border-border flex flex-col items-center justify-center gap-1 font-bold text-sm text-foreground">
                  <span className="tracking-wide uppercase text-xs">{day}</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                </div>

                {/* 8 Slot Cells */}
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
                    return (
                      <div
                        key={`${day}-${slot.id}`}
                        className={cn(
                          'p-1.5 border-r border-border last:border-r-0 relative flex flex-col',
                          isLab ? 'col-span-2 bg-highlight-light/30' : 'col-span-1 bg-surface'
                        )}
                      >
                        <motion.div
                          whileHover={{ scale: 1.015, y: -1 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => openSlotEditor(day, slot.id, assignment.duration, assignment.id)}
                          className={cn(
                            'w-full h-full rounded-xl p-2.5 flex flex-col justify-between cursor-pointer border transition-all duration-150 relative group',
                            isLab
                              ? 'bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border-highlight/40 hover:border-highlight hover:shadow-card'
                              : 'bg-primary-light/40 border-primary/20 hover:border-primary/60 hover:shadow-card'
                          )}
                        >
                          {/* Top Row: Subject code + Lab Tag / Duration */}
                          <div className="flex items-start justify-between gap-1">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span
                                className={cn(
                                  'font-mono text-xs font-extrabold px-1.5 py-0.5 rounded tracking-wide',
                                  isLab
                                    ? 'bg-highlight text-white shadow-sm'
                                    : 'bg-primary text-white shadow-sm'
                                )}
                              >
                                {assignedSubject?.code || 'SUBJ'}
                              </span>
                              {isLab && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-highlight uppercase tracking-wider bg-highlight/10 px-1.5 py-0.5 rounded">
                                  <FlaskConical className="w-2.5 h-2.5" />
                                  2-Hr Lab
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-muted flex items-center gap-0.5 opacity-70 group-hover:opacity-100">
                              <Clock className="w-2.5 h-2.5" />
                              {TIME_SLOTS[slot.id]?.shortLabel}
                            </span>
                          </div>

                          {/* Middle: Subject Name */}
                          <div className="my-1">
                            <p className="text-xs font-bold text-foreground line-clamp-2 leading-tight">
                              {assignedSubject?.name || 'Assigned Lecture'}
                            </p>
                          </div>

                          {/* Bottom: Faculty & Room */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground gap-1 border-t border-border/50 pt-1.5 mt-auto">
                            <div className="flex items-center gap-1 truncate font-medium">
                              <User className="w-3 h-3 text-muted shrink-0" />
                              <span className="truncate">{assignedFaculty?.name || 'Faculty'}</span>
                            </div>

                            {/* Location / Class Info */}
                            {selectedTargetType === 'class' && (
                              <div className="flex items-center gap-1 shrink-0 font-mono text-[10px] font-semibold text-primary">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span>{assignedLab?.name.split(' ')[0] || assignedRoom?.name || 'Class'}</span>
                              </div>
                            )}

                            {selectedTargetType !== 'class' && attendingClass && (
                              <div className="flex items-center gap-1 shrink-0 text-[10px] font-bold text-primary truncate max-w-[80px]">
                                <span>{attendingClass.name}</span>
                              </div>
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
                      className="p-1.5 border-r border-border last:border-r-0 col-span-1"
                    >
                      <button
                        onClick={() => openSlotEditor(day, slot.id, isLabTarget ? 2 : 1)}
                        className="w-full h-full min-h-[82px] rounded-xl border border-dashed border-border hover:border-accent hover:bg-accent-light/30 transition-all flex flex-col items-center justify-center text-muted hover:text-primary gap-1 group slot-dashed-pattern"
                      >
                        <div className="w-6 h-6 rounded-full bg-surface border border-border group-hover:border-accent group-hover:bg-primary group-hover:text-white flex items-center justify-center shadow-xs transition-colors">
                          <Plus className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[10px] font-medium opacity-60 group-hover:opacity-100">
                          {isLabTarget ? 'Schedule 2h Lab' : 'Add Slot'}
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
