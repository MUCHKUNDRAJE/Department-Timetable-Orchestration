'use client';

import React, { forwardRef } from 'react';
import { INSTITUTION_INFO, DAYS, TIME_SLOTS } from '@/lib/constants';
import { CollegeClass, Lab, Room, Faculty, Subject, Assignment, PrintMode, Day } from '@/types/timetable';
import { Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PrintPreviewSheetProps {
  mode: PrintMode;
  targetId: string;
  classes: CollegeClass[];
  labs: Lab[];
  rooms: Room[];
  facultyList: Faculty[];
  subjects: Subject[];
  assignments: Assignment[];
}

export const PrintPreviewSheet = forwardRef<HTMLDivElement, PrintPreviewSheetProps>(
  ({ mode, targetId, classes, labs, rooms, facultyList, subjects, assignments }, ref) => {
    // Determine Target Title and Subtitle
    let title = '';
    let subtitle = '';
    let entityType = '';

    if (mode === 'ug') {
      const cls = classes.find((c) => c.id === targetId) || classes[0];
      entityType = 'UNDERGRADUATE CLASS TIMETABLE';
      title = cls ? `${cls.name} (Semester ${cls.semester} - Section ${cls.section})` : 'Class Timetable';
      subtitle = `Strength: ${cls?.studentCount || 60} Students | Academic Year: ${INSTITUTION_INFO.academicYear}`;
    } else if (mode === 'lab') {
      const lab = labs.find((l) => l.id === targetId) || labs[0];
      entityType = 'LABORATORY UTILIZATION SCHEDULE';
      title = lab ? lab.name : 'Lab Timetable';
      subtitle = `Capacity: ${lab?.capacity || 30} Workstations | Location: ${lab?.location || 'Main Block'}`;
    } else if (mode === 'room') {
      const room = rooms.find((r) => r.id === targetId) || rooms[0];
      entityType = 'CLASSROOM ALLOCATION SCHEDULE';
      title = room ? `Room ${room.name}` : 'Room Timetable';
      subtitle = `Seating Capacity: ${room?.capacity || 70} | Building: ${room?.building || 'Main Wing'}`;
    } else {
      const fac = facultyList.find((f) => f.id === targetId) || facultyList[0];
      entityType = 'FACULTY INDIVIDUAL WORKLOAD TIMETABLE';
      title = fac ? `${fac.name} (${fac.designation})` : 'Faculty Timetable';
      subtitle = `Department of ${fac?.department || 'AI & DS'} | Max Load: ${fac?.maxWeeklyHours || 20} hrs/week`;
    }

    // Filter assignments for this specific target
    const currentAssignments = assignments.filter((a) => {
      if (mode === 'ug') {
        return (a.targetType === 'class' && a.targetId === targetId) || a.classId === targetId;
      }
      if (mode === 'lab') {
        return (a.targetType === 'lab' && a.targetId === targetId) || a.labId === targetId;
      }
      if (mode === 'room') {
        return (a.targetType === 'room' && a.targetId === targetId) || a.roomId === targetId;
      }
      return a.facultyId === targetId;
    });

    // Helper to find assignment at day and slot
    const getAssignmentAt = (day: Day, slotId: number) => {
      return currentAssignments.find((a) => a.day === day && a.startSlot === slotId);
    };

    const isSlotCoveredByPreviousLab = (day: Day, slotId: number) => {
      if (slotId === 0) return false;
      const prev = currentAssignments.find(
        (a) => a.day === day && a.startSlot === slotId - 1 && a.duration === 2
      );
      return !!prev;
    };

    // Extract unique subjects in this timetable for the legend
    const usedSubjectIds = Array.from(new Set(currentAssignments.map((a) => a.subjectId)));
    const legendSubjects = subjects.filter((s) => usedSubjectIds.includes(s.id));

    // Calculate total hours
    const totalWeeklyHours = currentAssignments.reduce((acc, curr) => acc + curr.duration, 0);

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-8 rounded-xl border border-slate-300 shadow-md font-sans text-xs print:p-0 print:border-none print:shadow-none min-w-[920px]"
      >
        {/* Official Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-extrabold tracking-wider uppercase text-slate-900">
                {INSTITUTION_INFO.collegeName}
              </h1>
              <p className="text-xs font-semibold text-slate-700">{INSTITUTION_INFO.department}</p>
              <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                <span>ACADEMIC YEAR: {INSTITUTION_INFO.academicYear}</span>
                <span>•</span>
                <span>EFFECTIVE: {INSTITUTION_INFO.effectiveDate}</span>
              </div>
            </div>
          </div>

          <div className="text-right">
            <span className="inline-block bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded tracking-wider uppercase mb-1">
              {entityType}
            </span>
            <div className="text-sm font-bold text-slate-900">{title}</div>
            <div className="text-[11px] text-slate-600">{subtitle}</div>
          </div>
        </div>

        {/* Timetable 8x6 Grid Table */}
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-5">
          <table className="w-full border-collapse text-center">
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-[11px] font-bold text-slate-800">
                <th className="p-2 border-r-2 border-slate-900 w-24">DAY \ TIME</th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot.id} className="p-2 border-r border-slate-300 last:border-r-0">
                    <div className="font-mono">{slot.shortLabel}</div>
                    <div className="text-[9px] text-slate-500 font-normal">
                      {slot.start}-{slot.end}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-b border-slate-300 last:border-b-0 h-16">
                  {/* Day Column */}
                  <td className="p-2 bg-slate-50 border-r-2 border-slate-900 font-bold font-mono text-xs uppercase text-slate-900">
                    {day}
                  </td>

                  {/* Slots */}
                  {TIME_SLOTS.map((slot) => {
                    const assignment = getAssignmentAt(day, slot.id);
                    const isCovered = isSlotCoveredByPreviousLab(day, slot.id);

                    if (isCovered) return null;

                    if (assignment) {
                      const isLab = assignment.duration === 2;
                      const fac = facultyList.find((f) => f.id === assignment.facultyId);
                      const subj = subjects.find((s) => s.id === assignment.subjectId);
                      const room = rooms.find((r) => r.id === assignment.roomId);
                      const lab = labs.find((l) => l.id === assignment.labId);
                      const cls = classes.find((c) => c.id === assignment.classId);

                      return (
                        <td
                          key={`${day}-${slot.id}`}
                          colSpan={isLab ? 2 : 1}
                          className={cn(
                            'p-1.5 border-r border-slate-300 last:border-r-0 align-middle',
                            isLab ? 'bg-pink-50/60 font-semibold' : 'bg-indigo-50/50'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-0.5">
                            <div className="font-mono text-xs font-bold text-slate-900">
                              {subj?.code || 'CODE'}
                              {isLab && (
                                <span className="ml-1 text-[9px] uppercase px-1 py-0.2 rounded bg-pink-200 text-pink-900 font-extrabold">
                                  Lab (2h)
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-700 font-medium truncate max-w-[110px]">
                              {fac?.name || 'Faculty'}
                            </div>
                            <div className="text-[9px] text-slate-500 font-mono">
                              {mode === 'ug' && (lab?.name.split(' ')[0] || room?.name || 'Hall')}
                              {mode !== 'ug' && cls?.name}
                            </div>
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${day}-${slot.id}`}
                        colSpan={1}
                        className="p-1 border-r border-slate-300 last:border-r-0 text-slate-300 text-[10px] font-mono"
                      >
                        —
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Legend & Workload Summary */}
        <div className="grid grid-cols-3 gap-4 border border-slate-300 rounded-lg p-3 bg-slate-50/60 mb-6 text-[10px]">
          <div className="col-span-2 space-y-1">
            <span className="font-bold text-slate-800 uppercase tracking-wider">
              Subject Code Index:
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-1">
              {legendSubjects.map((s) => (
                <div key={s.id} className="flex items-center gap-1.5 truncate">
                  <span className="font-mono font-bold text-slate-900 bg-white px-1.5 py-0.5 rounded border border-slate-300">
                    {s.code}
                  </span>
                  <span className="truncate text-slate-700 font-medium">
                    {s.name} ({s.type.toUpperCase()})
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-l border-slate-300 pl-3 flex flex-col justify-between">
            <div>
              <span className="font-bold text-slate-800 uppercase tracking-wider block">
                Workload Metrics
              </span>
              <div className="mt-1 space-y-0.5 font-mono text-slate-700">
                <div>Total Weekly Hours: <strong className="text-slate-900">{totalWeeklyHours} hrs</strong></div>
                <div>Teaching Days: <strong>Monday — Saturday</strong></div>
              </div>
            </div>
            <div className="text-[9px] text-slate-500 font-mono">
              Generated: {new Date().toLocaleDateString('en-US', { dateStyle: 'medium' })}
            </div>
          </div>
        </div>

        {/* Official Institutional Signatures */}
        <div className="pt-8 grid grid-cols-3 text-center border-t border-slate-300 text-xs font-semibold text-slate-800">
          <div>
            <div className="h-9 border-b border-dashed border-slate-400 mb-1.5" />
            <span>{INSTITUTION_INFO.coordinatorName}</span>
            <span className="block text-[10px] text-slate-500 font-normal">Timetable Coordinator</span>
          </div>

          <div>
            <div className="h-9 border-b border-dashed border-slate-400 mb-1.5" />
            <span>{INSTITUTION_INFO.hodName}</span>
            <span className="block text-[10px] text-slate-500 font-normal">Head of Department</span>
          </div>

          <div>
            <div className="h-9 border-b border-dashed border-slate-400 mb-1.5" />
            <span>{INSTITUTION_INFO.deanName}</span>
            <span className="block text-[10px] text-slate-500 font-normal">Dean of Academic Affairs</span>
          </div>
        </div>
      </div>
    );
  }
);

PrintPreviewSheet.displayName = 'PrintPreviewSheet';
