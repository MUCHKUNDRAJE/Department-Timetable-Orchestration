'use client';

import React, { forwardRef } from 'react';
import Image from 'next/image';
import { INSTITUTION_INFO, DAYS, TIME_SLOTS } from '@/lib/constants';
import { CollegeClass, Lab, Room, Faculty, Subject, Assignment, PrintMode, Day } from '@/types/timetable';
import { Building2, UserCheck, BookOpen, Clock, CalendarDays } from 'lucide-react';
import { cn, getSubjectInitials, getFacultyInitials, getVenueDisplay } from '@/lib/utils';

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
    // Determine Target Title, Subtitle and Type
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
    const usedSubjectIds = Array.from(new Set(currentAssignments.map((a) => a.subjectId)));
    const activeSubjects = subjects.filter((s) => usedSubjectIds.includes(s.id));
    // If no assignments yet, show department subjects
    const displaySubjects = activeSubjects.length > 0 ? activeSubjects : subjects.slice(0, 8);

    const usedFacultyIds = Array.from(new Set(currentAssignments.map((a) => a.facultyId)));
    const activeFaculty = facultyList.filter((f) => usedFacultyIds.includes(f.id));
    const displayFaculty = activeFaculty.length > 0 ? activeFaculty : facultyList.slice(0, 8);

    // Faculty hours map for the current schedule
    const facultyScheduleHours = new Map<string, number>();
    currentAssignments.forEach((a) => {
      facultyScheduleHours.set(
        a.facultyId,
        (facultyScheduleHours.get(a.facultyId) || 0) + (a.duration || 1)
      );
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
        className="bg-white text-slate-900 p-6 sm:p-8 rounded-xl border border-slate-300 shadow-md font-sans text-xs print:p-4 sm:print:p-6 print:border-none print:shadow-none w-full max-w-[1200px] mx-auto print:max-w-none print:w-full box-border"
      >
        {/* Official Institutional Header */}
        <div className="border-b-2 border-slate-900 pb-3 mb-3.5 flex items-center justify-between gap-4">
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
                <span>ACADEMIC YEAR: {INSTITUTION_INFO.academicYear}</span>
                <span>•</span>
                <span>EFFECTIVE: {INSTITUTION_INFO.effectiveDate}</span>
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
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-3.5 bg-white">
          <table className="w-full table-fixed border-collapse text-center">
            <colgroup>
              <col style={{ width: '9%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
              <col style={{ width: '11.375%' }} />
            </colgroup>
            <thead>
              <tr className="bg-slate-100 border-b-2 border-slate-900 text-[11px] font-bold text-slate-800">
                <th className="p-1.5 border-r-2 border-slate-900 font-extrabold uppercase text-[10px]">
                  DAY \ TIME
                </th>
                {TIME_SLOTS.map((slot) => (
                  <th key={slot.id} className="p-1 border-r border-slate-300 last:border-r-0">
                    <div className="font-mono font-bold text-[10px] text-slate-900 leading-tight">
                      {slot.shortLabel}
                    </div>
                    <div className="text-[8px] text-slate-500 font-normal leading-tight">
                      {slot.start} - {slot.end}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {DAYS.map((day) => (
                <tr key={day} className="border-b border-slate-300 last:border-b-0 min-h-[56px]">
                  {/* Day Column */}
                  <td className="p-1.5 bg-slate-50 border-r-2 border-slate-900 font-bold font-mono text-xs uppercase text-slate-900">
                    {day}
                  </td>

                  {/* 8 Slots */}
                  {TIME_SLOTS.map((slot) => {
                    const assignment = getAssignmentAt(day, slot.id);
                    const isCovered = isSlotCoveredByPreviousLab(day, slot.id);

                    if (isCovered) return null;

                    if (assignment) {
                      const isLab = assignment.duration === 2;
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

                        const facA1 = getFacultyInitials(facultyList.find((f) => f.id === bA1?.facultyId));
                        const facA2 = getFacultyInitials(facultyList.find((f) => f.id === bA2?.facultyId));
                        const facA3 = getFacultyInitials(facultyList.find((f) => f.id === bA3?.facultyId));
                        const facA4 = getFacultyInitials(facultyList.find((f) => f.id === bA4?.facultyId));

                        const getCleanLabName = (labId?: string) => {
                          if (labId) {
                            const l = labs.find((item) => item.id === labId);
                            if (l) {
                              return l.name
                                .replace(/Laboratory/gi, 'Lab')
                                .replace(/Artificial Intelligence & Data Science/gi, 'AIDS')
                                .trim();
                            }
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
                            title={`4-Batch Practical: A1[${facA1}], A2[${facA2}], A3[${facA3}], A4[${facA4}] | Labs: ${labA1}, ${labA2}, ${labA3}, ${labA4}`}
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

                              {/* Labs */}
                              <div className="text-[8px] text-slate-600 font-medium leading-none">
                                {labA1}, {labA2} <span className="text-slate-400 font-normal">/</span> {labA3}, {labA4}
                              </div>
                            </div>
                          </td>
                        );
                      }

                      const fac = facultyList.find((f) => f.id === assignment.facultyId);
                      const subj = subjects.find((s) => s.id === assignment.subjectId);
                      const room = rooms.find((r) => r.id === assignment.roomId);
                      const lab = labs.find((l) => l.id === assignment.labId);
                      const cls = classes.find((c) => c.id === assignment.classId);

                      const subjectInitials = getSubjectInitials(subj);
                      const facultyInitials = getFacultyInitials(fac);
                      const venueDisplay = isLab
                        ? (lab ? getVenueDisplay(undefined, lab) : 'Lab')
                        : getVenueDisplay(room, lab);

                      return (
                        <td
                          key={`${day}-${slot.id}`}
                          colSpan={isLab ? 2 : 1}
                          title={`${subj?.name} (${subj?.code}) | Faculty: ${fac?.name || 'Faculty'} | Venue: ${venueDisplay}`}
                          className={cn(
                            'p-1 border-r border-slate-300 last:border-r-0 align-middle',
                            isLab
                              ? 'bg-rose-50/85 border-rose-200 text-slate-900'
                              : 'bg-indigo-50/75 border-indigo-100 text-slate-900'
                          )}
                        >
                          <div className="flex flex-col items-center justify-center gap-1 font-mono py-1">
                            {/* Subject Initials + 2h tag if Lab */}
                            <div className="flex items-center justify-center gap-1.5 text-[11px] font-black text-slate-900 leading-none">
                              <span>{subjectInitials}</span>
                              {isLab && (
                                <span className="text-[7.5px] uppercase px-1 py-0.5 rounded bg-rose-200 text-rose-950 font-extrabold border border-rose-300/80 leading-none">
                                  2h Lab
                                </span>
                              )}
                            </div>

                            {/* Faculty Initials Badge + Room No */}
                            <div className="flex items-center justify-center gap-1.5 text-[9.5px] text-slate-800 font-mono leading-none">
                              <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-white text-indigo-950 font-bold border border-slate-300 shadow-xs text-[9px] leading-none">
                                {facultyInitials}
                              </span>
                              <span className="text-slate-400 font-normal leading-none">•</span>
                              <span className="text-slate-800 font-bold leading-none">{venueDisplay}</span>
                            </div>

                            {/* Attending class if not UG mode */}
                            {mode !== 'ug' && cls?.name && (
                              <div className="text-[8.5px] text-slate-600 font-medium leading-none">
                                {cls.name.split(' ')[0]}
                              </div>
                            )}

                            {/* Subject Code (Compact) */}
                            {mode === 'ug' && subj?.code && (
                              <div className="text-[8px] text-slate-500 font-medium leading-none">
                                {subj.code}
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

        {/* Full Faculty & Subject Reference Key Matrix (No scrollbars, fully expanded) */}
        <div className="border-2 border-slate-900 rounded-lg overflow-hidden mb-3.5 bg-slate-50/70">
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
                    return (
                      <tr key={s.id} className="py-0.5">
                        <td className="py-1 font-mono font-black text-slate-900">
                          [{getSubjectInitials(s)}]
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

          {/* Workload & Summary Metrics Footer Bar */}
          <div className="bg-slate-100 border-t border-slate-300 px-3 py-1.5 flex flex-wrap items-center justify-between text-[9px] font-mono text-slate-700 gap-2">
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

        {/* Official Institutional Signatures */}
        <div className="pt-4 grid grid-cols-3 text-center border-t-2 border-slate-900 text-xs font-semibold text-slate-900">
          <div className="px-2">
            <div className="h-7 border-b border-dashed border-slate-400 mb-1" />
            <span className="font-bold text-[11px]">{INSTITUTION_INFO.coordinatorName}</span>
            <span className="block text-[9px] text-slate-600 font-normal">Timetable Coordinator</span>
          </div>

          <div className="px-2">
            <div className="h-7 border-b border-dashed border-slate-400 mb-1" />
            <span className="font-bold text-[11px]">{INSTITUTION_INFO.hodName}</span>
            <span className="block text-[9px] text-slate-600 font-normal">Head of Department</span>
          </div>

          <div className="px-2">
            <div className="h-7 border-b border-dashed border-slate-400 mb-1" />
            <span className="font-bold text-[11px]">{INSTITUTION_INFO.deanName}</span>
            <span className="block text-[9px] text-slate-600 font-normal">Dean of Academic Affairs</span>
          </div>
        </div>
      </div>
    );
  }
);

PrintPreviewSheet.displayName = 'PrintPreviewSheet';
