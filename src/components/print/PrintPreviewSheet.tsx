'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';
import { INSTITUTION_INFO, DAYS, TIME_SLOTS } from '@/lib/constants';
import { CollegeClass, Lab, Room, Faculty, Subject, Assignment, PrintMode, Day } from '@/types/timetable';
import { Building2, UserCheck, BookOpen, Clock, CalendarDays } from 'lucide-react';
import { cn, getSubjectInitials, getFacultyInitials, getVenueDisplay } from '@/lib/utils';
import { useTimetableStore } from '@/lib/store';

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
    const storeAcademicSession = useTimetableStore((s) => s.academicSession);
    const activeSession = storeAcademicSession || INSTITUTION_INFO.academicYear;

    // Determine Target Title, Subtitle and Type
    let title = '';
    let subtitle = '';
    let entityType = '';

    if (mode === 'ug') {
      const cls = classes.find((c) => c.id === targetId) || classes[0];
      entityType = 'UNDERGRADUATE CLASS TIMETABLE';
      title = cls ? `${cls.name} (Semester ${cls.semester} - Section ${cls.section})` : 'Class Timetable';
      subtitle = `Strength: ${cls?.studentCount || 60} Students | Academic Session: ${activeSession}`;
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
      subtitle = `Department of ${fac?.department || 'AI & DS'} | Max Allowance: ${fac?.maxWeeklyHours || 20} hrs/week`;
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

    // Extract subjects and faculty involved in this schedule
    const usedSubjectIds = Array.from(
      new Set(currentAssignments.map((a) => a.subjectId).filter((id): id is string => Boolean(id)))
    );
    const activeSubjects = subjects.filter((s) => usedSubjectIds.includes(s.id));
    // If no assignments yet, show department subjects
    const displaySubjects = activeSubjects.length > 0 ? activeSubjects : subjects.slice(0, 8);

    const usedFacultyIds = Array.from(
      new Set(currentAssignments.map((a) => a.facultyId).filter((id): id is string => Boolean(id)))
    );
    const activeFaculty = facultyList.filter((f) => usedFacultyIds.includes(f.id));
    const displayFaculty = activeFaculty.length > 0 ? activeFaculty : facultyList.slice(0, 8);

    // Faculty hours map for the current schedule
    const facultyScheduleHours = new Map<string, number>();
    currentAssignments.forEach((a) => {
      if (a.facultyId && !a.isRecess) {
        facultyScheduleHours.set(
          a.facultyId,
          (facultyScheduleHours.get(a.facultyId) || 0) + (a.duration || 1)
        );
      }
    });

    // Find assigned faculty for a subject
    const getFacultyForSubject = (subjId: string) => {
      const asg = currentAssignments.find((a) => a.subjectId === subjId);
      if (asg) {
        const f = facultyList.find((fac) => fac.id === asg.facultyId);
        return f ? getFacultyInitials(f) : '—';
      }
      const mapped = facultyList.find((f) => f.subjectIds?.includes(subjId));
      return mapped ? getFacultyInitials(mapped) : '—';
    };

    // Calculate total hours, lectures, and lab counts
    const totalWeeklyHours = currentAssignments.reduce((acc, curr) => acc + (curr.duration || 1), 0);
    const totalLabBlocks = currentAssignments.filter((a) => a.duration === 2).length;
    const totalLectures = currentAssignments.filter((a) => a.duration === 1).length;

    return (
      <div
        ref={ref}
        className="bg-white text-slate-900 p-5 sm:p-6 rounded-xl border border-slate-300 shadow-md font-sans text-xs print:p-4 print:border-none print:shadow-none w-full max-w-[1200px] mx-auto box-border break-inside-avoid"
      >
        {/* Official Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold shrink-0">
              <Image src="/image.png" alt="Logo" width={48} height={48} />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold tracking-wider uppercase text-slate-900 leading-tight truncate">
                {INSTITUTION_INFO.collegeName}
              </h1>
              <p className="text-xs font-semibold text-slate-700 truncate">{INSTITUTION_INFO.department}</p>
              <div className="flex items-center gap-2.5 text-[10px] text-slate-500 font-mono mt-0.5">
                <span>ACADEMIC SESSION: {activeSession}</span>
              </div>
            </div>
          </div>

          <div className="text-right shrink-0 max-w-[45%] pr-2">
            <span className="inline-block bg-slate-900 text-white text-[10px] font-bold px-2.5 py-0.5 rounded tracking-wider uppercase mb-1">
              {entityType}
            </span>
            <div className="text-sm font-bold text-slate-900 leading-snug">{title}</div>
            <div className="text-[11px] text-slate-600 font-medium leading-snug">{subtitle}</div>
          </div>
        </div>

        {/* Timetable 8x6 Grid Table */}
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-3 bg-white">
          <table className="w-full table-fixed border-collapse text-center">
            <colgroup>
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
              <col style={{ width: '10.5%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-[11px] font-bold text-slate-800">
                <th className="p-1.5 border-r-2 border-slate-900 font-extrabold uppercase text-[10px]">
                  DAY \ TIME
                </th>
                <th className="p-1.5 border-r-2 border-slate-900 font-extrabold uppercase text-[10px] text-slate-700">
                  LEGEND
                </th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot.id} className="p-1 border-r border-slate-300 last:border-r-0">
                    <div className="font-mono font-bold text-[10.5px] text-slate-900 leading-tight">
                      {slot.shortLabel}
                    </div>
                    <div className="text-[8.5px] text-slate-500 font-normal leading-tight mt-0.5">
                      {slot.start} - {slot.end}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-b border-slate-300 last:border-b-0 min-h-[50px]">
                  {/* Day Column */}
                  <td className="p-1.5 bg-slate-50 border-r-2 border-slate-900 font-bold font-mono text-xs uppercase text-slate-900">
                    {day}
                  </td>
                  <td className="p-1 text-center bg-slate-50 border-r-2 border-slate-900 font-bold font-mono text-[9px] uppercase text-slate-800 leading-tight">
                    <div className="text-slate-900 font-extrabold">Subj.</div>
                    <div className="text-indigo-900 font-bold">Fac.</div>
                    <div className="text-slate-600 font-medium">Room</div>
                    {mode !== 'ug' && <div className="text-amber-800 font-bold">Class</div>}
                  </td>

                  {/* 8 Slots */}
                  {TIME_SLOTS.map((slot) => {
                    const assignment = getAssignmentAt(day, slot.id);
                    const isCovered = isSlotCoveredByPreviousLab(day, slot.id);

                    if (isCovered) return null;

                    if (assignment) {
                      // Recess Slot in Lightgreen background with Black text
                      if (assignment.isRecess) {
                        return (
                          <td
                            key={`${day}-${slot.id}`}
                            colSpan={1}
                            title={`Institutional Recess (${TIME_SLOTS[slot.id]?.start} - ${TIME_SLOTS[slot.id]?.end})`}
                            className="p-1 border-r border-slate-300 last:border-r-0 align-middle text-black"
                            style={{ backgroundColor: '#dcfce7', color: '#000000' }}
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5 font-mono py-1 text-center">
                              <span className="text-[11px] font-black text-black tracking-wider uppercase leading-none">
                                RECESS
                              </span>
                              <span className="text-[8px] font-bold text-black uppercase tracking-tight px-1 py-0.2 rounded bg-green-200/90 border border-green-400 leading-none">
                                Break
                              </span>
                            </div>
                          </td>
                        );
                      }

                      const isLab = assignment.duration === 2;
                      const isBatchLab = isLab && assignment.labBatches && assignment.labBatches.length > 0;
                      const attendingClass = classes.find(
                        (c) => c.id === (assignment.targetType === 'class' ? assignment.targetId : assignment.classId)
                      );

                      if (isBatchLab && assignment.labBatches) {
                        const bA1 = assignment.labBatches.find((b) => b.id === 'A1');
                        const bA2 = assignment.labBatches.find((b) => b.id === 'A2');
                        const bA3 = assignment.labBatches.find((b) => b.id === 'A3');
                        const bA4 = assignment.labBatches.find((b) => b.id === 'A4');

                        const sA1 = subjects.find((s) => s.id === bA1?.subjectId);
                        const sA2 = subjects.find((s) => s.id === bA2?.subjectId);
                        const sA3 = subjects.find((s) => s.id === bA3?.subjectId);
                        const sA4 = subjects.find((s) => s.id === bA4?.subjectId);

                        const initA1 = sA1 ? (sA1.abbreviation || getSubjectInitials(sA1)) : 'LAB';
                        const initA2 = sA2 ? (sA2.abbreviation || getSubjectInitials(sA2)) : initA1;
                        const initA3 = sA3 ? (sA3.abbreviation || getSubjectInitials(sA3)) : initA1;
                        const initA4 = sA4 ? (sA4.abbreviation || getSubjectInitials(sA4)) : initA1;

                        const g1Subj = Array.from(new Set([initA1, initA2].filter(Boolean))).join('/');
                        const g2Subj = Array.from(new Set([initA3, initA4].filter(Boolean))).join('/');
                        const headerSubj = g1Subj === g2Subj ? g1Subj : `${g1Subj} / ${g2Subj}`;

                        const facA1 = getFacultyInitials(facultyList.find((f) => f.id === bA1?.facultyId));
                        const facA2 = getFacultyInitials(facultyList.find((f) => f.id === bA2?.facultyId));
                        const facA3 = getFacultyInitials(facultyList.find((f) => f.id === bA3?.facultyId));
                        const facA4 = getFacultyInitials(facultyList.find((f) => f.id === bA4?.facultyId));

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
                          <td
                            key={`${day}-${slot.id}`}
                            colSpan={2}
                            title={`4-Batch Practical: A1[${facA1}], A2[${facA2}], A3[${facA3}], A4[${facA4}] | Labs: ${labA1}, ${labA2}, ${labA3}, ${labA4}${attendingClass ? ` | Class: ${attendingClass.name}` : ''}`}
                            className="p-1 border-r border-slate-300 last:border-r-0 align-middle bg-rose-50/85 border-rose-200 text-slate-900"
                          >
                            <div className="flex flex-col items-center justify-center gap-0.5 font-mono py-0.5 text-center">
                              {/* Subject Title */}
                              <div className="flex items-center justify-center gap-1 text-[10px] font-black text-slate-900 leading-none">
                                <span className="text-rose-950 font-black">LAB - {headerSubj}</span>
                                <span className="text-[7px] uppercase px-1 py-0.2 rounded bg-rose-200 text-rose-950 font-extrabold border border-rose-300/80">
                                  4B
                                </span>
                              </div>

                              {/* Batches & Faculty */}
                              <div className="text-[8.5px] font-bold text-indigo-950 leading-none py-0.5">
                                A1[{facA1}], A2[{facA2}] <span className="text-slate-400 font-normal">/</span> A3[{facA3}], A4[{facA4}]
                              </div>

                              {/* Full Labs */}
                              <div className="text-[8px] text-slate-700 font-semibold leading-tight px-1">
                                {labA1}, {labA2} <span className="text-slate-400 font-normal">/</span> {labA3}, {labA4}
                              </div>

                              {/* Attending class if not UG mode */}
                              {mode !== 'ug' && attendingClass?.name && (
                                <div className="text-[8.5px] text-slate-900 font-bold bg-amber-100 px-1 py-0.2 rounded border border-amber-300 leading-none mt-0.5">
                                  {attendingClass.name}
                                </div>
                              )}
                            </div>
                          </td>
                        );
                      }

                      const fac = facultyList.find((f) => f.id === assignment.facultyId);
                      const subj = subjects.find((s) => s.id === assignment.subjectId);
                      const room = rooms.find((r) => r.id === assignment.roomId);
                      const lab = labs.find((l) => l.id === assignment.labId);

                      const subjectInitials = subj?.abbreviation || getSubjectInitials(subj);
                      const facultyInitials = getFacultyInitials(fac);
                      const venueDisplay = isLab
                        ? (lab?.name || 'Lab')
                        : (room?.name || lab?.name || 'Room');

                      return (
                        <td
                          key={`${day}-${slot.id}`}
                          colSpan={isLab ? 2 : 1}
                          title={`${subj?.name} (${subj?.code}) | Faculty: ${fac?.name || 'Faculty'} | Venue: ${venueDisplay}${attendingClass ? ` | Class: ${attendingClass.name}` : ''}`}
                          className={cn(
                            'p-1 border-r border-slate-300 last:border-r-0 align-middle',
                            isLab
                              ? 'bg-rose-50/85 border-rose-200 text-slate-900'
                              : 'bg-indigo-50/75 border-indigo-100 text-slate-900'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-1 font-mono py-1">
                            {/* Subject Initials + 2h tag if Lab */}
                            <div className="flex items-center justify-center gap-1 text-[11px] font-black text-slate-900 leading-none">
                              <span>{subjectInitials}</span>   
                              
                              {mode === 'ug' && subj?.code && (
                                <span className="text-[8px] text-slate-500 font-medium leading-none">
                                  {subj.code}
                                </span>
                              )}
                              {isLab && (
                                <span className="text-[7.5px] uppercase px-1 py-0.5 rounded bg-rose-200 text-rose-950 font-extrabold border border-rose-300/80 leading-none">
                                  2h Lab
                                </span>
                              )}
                            </div>

                            {/* Faculty Initials Badge + Full Room Name */}
                            <div className="flex items-center justify-center flex-col gap-0.5 text-[9px] text-slate-800 font-mono leading-tight px-0.5 flex-wrap">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white text-indigo-950 font-bold border border-slate-300 shadow-2xs text-[8.5px] leading-none shrink-0">
                                {facultyInitials}
                              </span>
                              <span className="text-slate-800 font-bold leading-tight break-words text-center text-[9px]">{venueDisplay}</span>
                            </div>

                            {/* Attending class if not UG mode */}
                            {mode !== 'ug' && attendingClass?.name && (
                              <div className="text-[8.5px] text-slate-900 font-bold bg-amber-100 px-1 py-0.5 rounded border border-amber-300 leading-none shadow-2xs">
                                {attendingClass.name}
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    }

                    return (
                      <td
                        key={`${day}-${slot.id}`}
                        colSpan={1}
                        className="p-1 border-r border-slate-300 last:border-r-0 text-slate-300 text-[10px] font-mono select-none"
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

        {/* Reference Sections & Dynamic Institutional Matrices */}
        <div className="space-y-3 mb-3">
          {/* Main 2-Column: Subject Matrix & Faculty Reference */}
          <div className="border-2 border-slate-900 rounded-lg overflow-hidden bg-slate-50/70">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-300">
              {/* Left Column: Subject Reference Matrix Table */}
              <div className="p-2.5">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-300">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Subject Reference Matrix</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">
                    {displaySubjects.length} Courses
                  </span>
                </div>

                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[8px]">
                      <th className="pb-1 w-12 font-mono">Abbr</th>
                      <th className="pb-1 w-16 font-mono">Code</th>
                      <th className="pb-1">Subject Title</th>
                      <th className="pb-1 w-16 text-center">Type</th>
                      <th className="pb-1 w-10 text-center font-mono">Fac</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displaySubjects.map((s) => {
                      const isLab = s.type === 'lab' || s.name.toLowerCase().includes('lab');
                      const facInitial = getFacultyForSubject(s.id);
                      const displayAbbr = s.abbreviation || getSubjectInitials(s);
                      return (
                        <tr key={s.id} className="py-0.5">
                          <td className="py-1 font-mono font-black text-slate-900">
                            [{displayAbbr}]
                          </td>
                          <td className="py-1 font-mono font-semibold text-slate-600">
                            {s.code}
                          </td>
                          <td className="py-1 font-semibold text-slate-800 truncate max-w-[150px]">
                            {s.name}
                          </td>
                          <td className="py-1 text-center">
                            <span
                              className={cn(
                                'px-1 py-0.2 rounded text-[7.5px] font-mono font-bold uppercase',
                                isLab ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-slate-200 text-slate-700'
                              )}
                            >
                              {isLab ? 'Lab 2h' : 'Lecture'}
                            </span>
                          </td>
                          <td className="py-1 text-center font-mono font-bold text-indigo-900">
                            {facInitial}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Right Column: Faculty Reference & Short Form Directory Table */}
              <div className="p-2.5">
                <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-slate-300">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase tracking-wider text-[10px]">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Faculty Reference & Short Form Key</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500">
                    {displayFaculty.length} Faculty Members
                  </span>
                </div>

                <table className="w-full text-[9px] text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[8px]">
                      <th className="pb-1 w-12 font-mono">Abbr</th>
                      <th className="pb-1">Faculty Name</th>
                      <th className="pb-1">Designation</th>
                      <th className="pb-1 w-14 text-right font-mono">Schedule</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {displayFaculty.map((f) => {
                      const initials = getFacultyInitials(f);
                      const scheduleLoad = facultyScheduleHours.get(f.id) || 0;
                      return (
                        <tr key={f.id} className="py-0.5">
                          <td className="py-1 font-mono font-black text-indigo-900">
                            [{initials}]
                          </td>
                          <td className="py-1 font-bold text-slate-900 truncate max-w-[140px]">
                            {f.name}
                          </td>
                          <td className="py-1 text-slate-600 text-[8.5px] truncate max-w-[120px]">
                            {f.designation}
                          </td>
                          <td className="py-1 text-right font-mono font-bold">
                            {scheduleLoad > 0 ? (
                              <span className="bg-indigo-100 text-indigo-800 px-1 py-0.2 rounded text-[8px]">
                                {scheduleLoad} hrs
                              </span>
                            ) : (
                              <span className="text-slate-400 font-normal text-[8px]">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* 3 New Dedicated Institutional Reference Tables (Class Teacher, Timetable Incharge, HOD) */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
            {/* 1. Class Teacher Table (Shown on UG timetables or Faculty's personal timetable if assigned) */}
            <div className="border-2 border-slate-900 rounded-lg p-2 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-300">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px]">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Class Teacher Allocation</span>
                  </div>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-indigo-100 text-indigo-800 font-bold">
                    {mode === 'ug' ? 'UG Class' : 'Faculty Role'}
                  </span>
                </div>

                {mode === 'ug' ? (() => {
                  const currentClass = classes.find((c) => c.id === targetId) || classes[0];
                  const classTeacher = facultyList.find((f) => f.id === currentClass?.classTeacherId);
                  return classTeacher ? (
                    <table className="w-full text-[8.5px] text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-1 text-slate-500 font-semibold w-20">Class:</td>
                          <td className="py-1 font-bold text-slate-900">{currentClass?.name}</td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="py-1 text-slate-500 font-semibold">Teacher:</td>
                          <td className="py-1 font-bold text-indigo-950 flex items-center gap-1">
                            <span className="font-mono bg-indigo-100 text-indigo-900 px-1 rounded text-[8px]">
                              [{getFacultyInitials(classTeacher)}]
                            </span>
                            <span>{classTeacher.name}</span>
                          </td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-500 font-semibold">Designation:</td>
                          <td className="py-1 text-slate-700">{classTeacher.designation}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-[9px] italic">
                      No Class Teacher designated for this class.
                    </div>
                  );
                })() : (() => {
                  const facultyClassTeacherOf = classes.filter((c) => c.classTeacherId === targetId);
                  return facultyClassTeacherOf.length > 0 ? (
                    <div className="space-y-1">
                      <div className="text-[8px] font-bold uppercase text-slate-500">Incharge Of Class(es):</div>
                      <table className="w-full text-[8.5px] text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[7.5px]">
                            <th className="pb-0.5">Class Name</th>
                            <th className="pb-0.5 text-center">Sem</th>
                            <th className="pb-0.5 text-right">Strength</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {facultyClassTeacherOf.map((c) => (
                            <tr key={c.id}>
                              <td className="py-0.5 font-bold text-slate-900">{c.name}</td>
                              <td className="py-0.5 text-center font-mono">Sem {c.semester}</td>
                              <td className="py-0.5 text-right font-mono">{c.studentCount || 60}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-[9px] italic">
                      {mode === 'faculty' ? 'No Class Teacher responsibility assigned.' : 'Applies to UG timetables.'}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 2. Timetable Incharge Table */}
            <div className="border-2 border-slate-900 rounded-lg p-2 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-300">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px]">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Timetable Incharge</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-500">
                    {facultyList.filter((f) => f.roles?.includes('Timetable Incharge')).length} Members
                  </span>
                </div>

                {(() => {
                  const incharges = facultyList.filter((f) => f.roles?.includes('Timetable Incharge'));
                  return incharges.length > 0 ? (
                    <table className="w-full text-[8.5px] text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-300 text-slate-600 font-bold uppercase text-[7.5px]">
                          <th className="pb-0.5 w-8 font-mono">Abbr</th>
                          <th className="pb-0.5">Faculty Name</th>
                          <th className="pb-0.5 text-right">Designation</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {incharges.map((f) => (
                          <tr key={f.id}>
                            <td className="py-0.5 font-mono font-black text-indigo-900">
                              [{getFacultyInitials(f)}]
                            </td>
                            <td className="py-0.5 font-bold text-slate-900 truncate max-w-[100px]">{f.name}</td>
                            <td className="py-0.5 text-right text-slate-600 truncate max-w-[90px]">{f.designation}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-[9px] italic">
                      No Timetable Incharge assigned.
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* 3. Head of Department (HOD) Table */}
            <div className="border-2 border-slate-900 rounded-lg p-2 bg-slate-50/70 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-300">
                  <div className="flex items-center gap-1.5 font-extrabold text-slate-900 uppercase tracking-wider text-[9.5px]">
                    <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                    <span>Head of Department (HOD)</span>
                  </div>
                  <span className="text-[8px] font-mono px-1 py-0.2 rounded bg-rose-100 text-rose-800 font-bold">
                    Executive
                  </span>
                </div>

                {(() => {
                  const hod = facultyList.find((f) => f.roles?.includes('Head of Department (HOD)')) ||
                    facultyList.find((f) => f.designation.toLowerCase().includes('hod'));
                  return hod ? (
                    <table className="w-full text-[8.5px] text-left border-collapse">
                      <tbody>
                        <tr className="border-b border-slate-200">
                          <td className="py-1 text-slate-500 font-semibold w-16">HOD:</td>
                          <td className="py-1 font-bold text-slate-900 flex items-center gap-1">
                            <span className="font-mono bg-rose-100 text-rose-900 px-1 rounded text-[8px] font-bold">
                              [{getFacultyInitials(hod)}]
                            </span>
                            <span>{hod.name}</span>
                          </td>
                        </tr>
                        <tr className="border-b border-slate-200">
                          <td className="py-1 text-slate-500 font-semibold">Designation:</td>
                          <td className="py-1 text-slate-700">{hod.designation}</td>
                        </tr>
                        <tr>
                          <td className="py-1 text-slate-500 font-semibold">Email:</td>
                          <td className="py-1 font-mono text-slate-600 text-[8px] truncate max-w-[130px]">{hod.email}</td>
                        </tr>
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-center py-2 text-slate-400 text-[9px] italic">
                      {INSTITUTION_INFO.hodName || 'HOD not assigned'}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Workload & Summary Metrics Footer Bar */}
          <div className="bg-slate-100 border border-slate-300 rounded-lg px-3 py-1.5 flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-700 gap-2">
            <div className="flex items-center gap-4">
              <span>
                Total Weekly Load: <strong className="text-slate-900">{totalWeeklyHours} hrs</strong>
              </span>
              <span>•</span>
              <span>Lectures: <strong>{totalLectures} ({totalLectures}h)</strong></span>
              <span>•</span>
              <span>Lab Blocks: <strong>{totalLabBlocks} ({totalLabBlocks * 2}h)</strong></span>
            </div>
            <div className="text-slate-500 text-[8.5px]">
              Yeshwantrao Chavan College of Engineering • Effective {INSTITUTION_INFO.effectiveDate}
            </div>
          </div>
        </div>

        {/* Watermark Footer */}
        {/*} <div className="pt-3 text-center text-[8.5px] text-slate-400 font-mono select-none border-t border-slate-200 mt-2">
          Timetable Allocator • Created by Muchkundraje Thote
        </div>*/}
      </div>
    );
  }
);

PrintPreviewSheet.displayName = 'PrintPreviewSheet';
