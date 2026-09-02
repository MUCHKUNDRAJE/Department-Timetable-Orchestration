import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { INSTITUTION_INFO, DAYS, TIME_SLOTS } from '@/lib/constants';
import { CollegeClass, Faculty, Subject, Room, Lab, Assignment, Day } from '@/types/timetable';
import { getSubjectInitials, getFacultyInitials } from '@/lib/utils';

// Color Palette Constants for ExcelJS (ARGB format: AARRGGBB)
const COLORS = {
  GREEN_HEADER: 'FF99FF99',    // Light Green for Time / Period No. header
  GREY_LABEL: 'FFEAEAEA',      // Soft Grey for Subject/Faculty/Room Abbr labels
  LIGHT_BLUE: 'FFB6DDE8',      // Light Blue for populated subject cells
  LIGHT_PINK: 'FFFCE4E4',      // Light Pink for merged practical lab cells
  LIGHT_YELLOW: 'FFFFFF99',    // Light Yellow for Recess
  WHITE: 'FFFFFFFF',           // Pure White
  DARK_TEXT: 'FF000000',       // Black text
  BORDER_COLOR: 'FF000000',    // Thin Black Border
};

// Standard Thin Border
const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: 'thin', color: { argb: COLORS.BORDER_COLOR } },
  left: { style: 'thin', color: { argb: COLORS.BORDER_COLOR } },
  bottom: { style: 'thin', color: { argb: COLORS.BORDER_COLOR } },
  right: { style: 'thin', color: { argb: COLORS.BORDER_COLOR } },
};

interface BuildSheetParams {
  cls: CollegeClass;
  classes: CollegeClass[];
  facultyList: Faculty[];
  subjects: Subject[];
  rooms: Room[];
  labs: Lab[];
  assignments: Assignment[];
  academicSession?: string;
  version?: string;
  effectiveDate?: string;
}

/**
 * Builds one complete "YCCE CT Department Academic Timetable" worksheet
 * conforming strictly to the institutional template specification.
 */
async function buildClassWorksheet(workbook: ExcelJS.Workbook, params: BuildSheetParams): Promise<ExcelJS.Worksheet> {
  const {
    cls,
    classes,
    facultyList,
    subjects,
    rooms,
    labs,
    assignments,
    academicSession = INSTITUTION_INFO.academicYear,
    version = 'Version-3',
    effectiveDate = INSTITUTION_INFO.effectiveDate,
  } = params;

  // Filter assignments relevant to this class
  const classAssignments = assignments.filter((a) => {
    if (a.targetType === 'class') return a.targetId === cls.id;
    if (a.classId) return a.classId === cls.id;
    return false;
  });

  // Safe sheet name (max 31 chars, no special characters like : / \ ? * [ ])
  const semRoman = cls.semester === 3 ? 'III' : cls.semester === 4 ? 'IV' : cls.semester === 5 ? 'V' : cls.semester === 6 ? 'VI' : cls.semester === 7 ? 'VII' : cls.semester === 8 ? 'VIII' : `${cls.semester}`;
  const deptShort = cls.department?.includes('Computer') ? 'CT' : cls.department?.includes('Data') ? 'AIDS' : 'SEC';
  const rawSheetName = `${semRoman} ${deptShort}-${cls.section}`.replace(/[\\/*?:[\]]/g, '');
  const sheetName = rawSheetName.slice(0, 31) || `Sem-${cls.semester}-${cls.section}`;

  const ws = workbook.addWorksheet(sheetName, {
    pageSetup: {
      orientation: 'landscape',
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 1,
      margins: { left: 0.3, right: 0.3, top: 0.3, bottom: 0.3, header: 0.2, footer: 0.2 },
    },
  });

  // Set Column Widths — wide enough so all names/abbreviations fit in one line without wrapping
  ws.columns = [
    { key: 'colA', width: 14 }, // Day Column
    { key: 'colB', width: 16 }, // Subject/Faculty/Room label
    { key: 'colC', width: 22 }, // Period 0  (09:00-10:00)
    { key: 'colD', width: 22 }, // Period 1  (10:00-11:00)
    { key: 'colE', width: 22 }, // Period 2  (11:00-12:00)
    { key: 'colF', width: 20 }, // Period 3  (12:00-01:00 Recess)
    { key: 'colG', width: 22 }, // Period 4  (01:00-02:00)
    { key: 'colH', width: 22 }, // Period 5  (02:00-03:00)
    { key: 'colI', width: 22 }, // Period 6  (03:00-04:00)
    { key: 'colJ', width: 22 }, // Period 7  (04:00-05:00)
  ];

  // Helper for applying styles across a cell
  const styleCell = (
    cellRef: string,
    options: {
      value?: any;
      font?: Partial<ExcelJS.Font>;
      fill?: ExcelJS.FillPattern;
      alignment?: Partial<ExcelJS.Alignment>;
      border?: Partial<ExcelJS.Borders>;
    }
  ) => {
    const cell = ws.getCell(cellRef);
    if (options.value !== undefined) cell.value = options.value;
    if (options.font) cell.font = { name: 'Arial', ...options.font };
    if (options.fill) cell.fill = options.fill;
    if (options.alignment) cell.alignment = options.alignment;
    if (options.border) cell.border = options.border;
    return cell;
  };

  // Helper for applying borders to a merged rectangle range (e.g. 'A1:E1')
  const borderRange = (range: string, border: Partial<ExcelJS.Borders> = THIN_BORDER) => {
    const [start, end] = range.split(':');
    const startCol = start.charCodeAt(0) - 64;
    const startRow = parseInt(start.slice(1));
    const endCol = end ? end.charCodeAt(0) - 64 : startCol;
    const endRow = end ? parseInt(end.slice(1)) : startRow;

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        ws.getRow(r).getCell(c).border = border;
      }
    }
  };

  // ==========================================
  // ROW 1: INSTITUTION HEADER
  // ==========================================
  ws.getRow(1).height = 28;
  ws.mergeCells('A1:E1');
  styleCell('A1', {
    value: INSTITUTION_INFO.collegeName.toUpperCase(),
    font: { size: 14, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  ws.mergeCells('F1:H1');
  styleCell('F1', {
    value: `Department of ${cls.department || 'COMPUTER TECHNOLOGY'}`,
    font: { size: 12, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  ws.mergeCells('I1:J1');
  styleCell('I1', {
    value: `SESSION ${academicSession}`,
    font: { size: 12, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  // ==========================================
  // ROW 2: CLASS, TERM & EFFECTIVE DATE
  // ==========================================
  ws.getRow(2).height = 24;
  ws.mergeCells('A2:D2');
  styleCell('A2', {
    value: `Semester-${semRoman} SEM B.TECH  •  ${cls.name}`,
    font: { size: 11, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'left' },
  });

  styleCell('E2', {
    value: `Section--${cls.section}`,
    font: { size: 11, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  ws.mergeCells('F2:H2');
  styleCell('F2', {
    value: 'Academic Time Table (Term-I)',
    font: { size: 13, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  styleCell('I2', {
    value: version,
    font: { size: 11, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  styleCell('J2', {
    value: `W.e.f. ${effectiveDate}`,
    font: { size: 10.5, bold: true, color: { argb: COLORS.DARK_TEXT } },
    alignment: { vertical: 'middle', horizontal: 'center' },
  });

  // Empty row 3 spacer
  ws.getRow(3).height = 6;

  // ==========================================
  // ROW 4: TIME SLOTS HEADER (Green Fill FF99FF99)
  // ==========================================
  ws.getRow(4).height = 26;
  ws.mergeCells('A4:B4');
  styleCell('A4', {
    value: 'Time',
    font: { size: 11, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_HEADER } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange('A4:B4');

  const slotCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  TIME_SLOTS.forEach((slot, idx) => {
    const colLetter = slotCols[idx] || 'C';
    styleCell(`${colLetter}4`, {
      value: `${slot.start} To ${slot.end}`,
      font: { size: 10, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_HEADER } },
      alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
      border: THIN_BORDER,
    });
  });

  // ==========================================
  // ROW 5: PERIOD NUMBERS (0, 1, 2, 3...)
  // ==========================================
  ws.getRow(5).height = 22;
  ws.mergeCells('A5:B5');
  styleCell('A5', {
    value: 'Period No.',
    font: { size: 11, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_HEADER } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange('A5:B5');

  TIME_SLOTS.forEach((slot, idx) => {
    const colLetter = slotCols[idx] || 'C';
    styleCell(`${colLetter}5`, {
      value: idx,
      font: { size: 12, bold: true },
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREEN_HEADER } },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: THIN_BORDER,
    });
  });

  // Helper function to find assignment at day and slot
  const getAssignment = (dayKey: Day, slotId: number) => {
    return classAssignments.find((a) => a.day === dayKey && a.startSlot === slotId);
  };

  const isSlotCoveredByLab = (dayKey: Day, slotId: number) => {
    if (slotId === 0) return false;
    const prev = getAssignment(dayKey, slotId - 1);
    return Boolean(prev && prev.duration === 2);
  };

  // ==========================================
  // ROWS 6–23: WEEKDAY BLOCKS (Monday – Saturday)
  // ==========================================
  const weekdays: { key: Day; label: string }[] = [
    { key: 'Mon', label: 'Monday' },
    { key: 'Tue', label: 'Tuesday' },
    { key: 'Wed', label: 'Wednesday' },
    { key: 'Thu', label: 'Thursday' },
    { key: 'Fri', label: 'Friday' },
    { key: 'Sat', label: 'Saturday' },
  ];
  let currentRow = 6;

  weekdays.forEach(({ key: dayKey, label: dayLabel }) => {
    const r1 = currentRow;
    const r2 = currentRow + 1;
    const r3 = currentRow + 2;

    ws.getRow(r1).height = 24;
    ws.getRow(r2).height = 24;
    ws.getRow(r3).height = 24;

    // Column A: Merge 3 rows vertically for Day Name
    ws.mergeCells(`A${r1}:A${r3}`);
    styleCell(`A${r1}`, {
      value: dayLabel,
      font: { size: 12, bold: true },
      alignment: { vertical: 'middle', horizontal: 'center' },
      border: THIN_BORDER,
    });
    borderRange(`A${r1}:A${r3}`);

    // Column B: 3 Sub-row labels with Soft Grey fill
    const labels = [
      { row: r1, text: 'Subject Abbr.' },
      { row: r2, text: 'Faculty Abbr.' },
      { row: r3, text: 'Room No.' },
    ];

    labels.forEach((lbl) => {
      styleCell(`B${lbl.row}`, {
        value: lbl.text,
        font: { size: 9.5, bold: true, color: { argb: COLORS.DARK_TEXT } },
        fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
        alignment: { vertical: 'middle', horizontal: 'center' },
        border: THIN_BORDER,
      });
    });

    // Populate columns C through J (Period 0 to 7)
    TIME_SLOTS.forEach((slot, slotIdx) => {
      const colLetter = slotCols[slotIdx];
      const covered = isSlotCoveredByLab(dayKey, slot.id);
      if (covered) return; // already merged by preceding lab

      const assignment = getAssignment(dayKey, slot.id);

      // 1. Recess Slot: Merge 3 rows vertically when marked as isRecess in the timetable
      if (assignment?.isRecess) {
        ws.mergeCells(`${colLetter}${r1}:${colLetter}${r3}`);
        styleCell(`${colLetter}${r1}`, {
          value: 'RECESS',
          font: { size: 12, bold: true, color: { argb: COLORS.DARK_TEXT } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_YELLOW } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });
        borderRange(`${colLetter}${r1}:${colLetter}${r3}`);
        return;
      }

      // 2. Practical Lab (2 Hours spanning 2 period columns)
      if (assignment && assignment.duration === 2) {
        const nextColLetter = slotCols[slotIdx + 1] || colLetter;

        const isBatchLab = assignment.labBatches && assignment.labBatches.length > 0;
        let subjectText = '';
        let facultyText = '';
        let roomText = '';

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

          const g1 = Array.from(new Set([initA1, initA2].filter(Boolean))).join('/');
          const g2 = Array.from(new Set([initA3, initA4].filter(Boolean))).join('/');
          subjectText = g1 === g2 ? `[${g1}] PRACTICALS` : `[${g1}]/[${g2}] PRACTICALS`;

          const facA1 = getFacultyInitials(facultyList.find((f) => f.id === bA1?.facultyId));
          const facA2 = getFacultyInitials(facultyList.find((f) => f.id === bA2?.facultyId));
          const facA3 = getFacultyInitials(facultyList.find((f) => f.id === bA3?.facultyId));
          const facA4 = getFacultyInitials(facultyList.find((f) => f.id === bA4?.facultyId));

          facultyText = `[A1]-[${facA1}],[A2]-[${facA2}]/[A3]-[${facA3}],[A4]-[${facA4}]`;

          const getLabName = (labId?: string) => {
            if (labId) {
              const l = labs.find((item) => item.id === labId);
              if (l) return l.name;
            }
            return 'CT-LAB';
          };
          const lab1 = getLabName(bA1?.labId);
          const lab2 = getLabName(bA3?.labId);
          roomText = lab1 === lab2 ? `[${lab1}]` : `[${lab1}]/[${lab2}]`;
        } else {
          const subj = subjects.find((s) => s.id === assignment.subjectId);
          const fac = facultyList.find((f) => f.id === assignment.facultyId);
          const lab = labs.find((l) => l.id === assignment.labId);

          subjectText = `[${subj?.abbreviation || getSubjectInitials(subj)}] PRACTICALS`;
          facultyText = getFacultyInitials(fac);
          roomText = lab ? `[${lab.name}]` : '[LAB]';
        }

        // Merge Row 1: Subject Abbr (ColSpan 2)
        ws.mergeCells(`${colLetter}${r1}:${nextColLetter}${r1}`);
        styleCell(`${colLetter}${r1}`, {
          value: subjectText,
          font: { size: 10.5, bold: true, color: { argb: 'FF900000' } },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_PINK } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });
        borderRange(`${colLetter}${r1}:${nextColLetter}${r1}`);

        // Merge Row 2: Faculty Abbr (ColSpan 2)
        ws.mergeCells(`${colLetter}${r2}:${nextColLetter}${r2}`);
        styleCell(`${colLetter}${r2}`, {
          value: facultyText,
          font: { size: 9, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_PINK } },
          alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
          border: THIN_BORDER,
        });
        borderRange(`${colLetter}${r2}:${nextColLetter}${r2}`);

        // Merge Row 3: Room No. (ColSpan 2)
        ws.mergeCells(`${colLetter}${r3}:${nextColLetter}${r3}`);
        styleCell(`${colLetter}${r3}`, {
          value: roomText,
          font: { size: 9.5, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_PINK } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });
        borderRange(`${colLetter}${r3}:${nextColLetter}${r3}`);
        return;
      }

      // 3. Regular 1-Hour Lecture
      if (assignment) {
        const subj = subjects.find((s) => s.id === assignment.subjectId);
        const fac = facultyList.find((f) => f.id === assignment.facultyId);
        const room = rooms.find((r) => r.id === assignment.roomId);

        const subAbbr = subj?.abbreviation || getSubjectInitials(subj);
        const facAbbr = getFacultyInitials(fac);
        const roomName = room ? `[${room.name}]` : '[EL-102]';

        styleCell(`${colLetter}${r1}`, {
          value: subAbbr,
          font: { size: 11, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });

        styleCell(`${colLetter}${r2}`, {
          value: facAbbr,
          font: { size: 10, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });

        styleCell(`${colLetter}${r3}`, {
          value: roomName,
          font: { size: 9.5, bold: true },
          fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.LIGHT_BLUE } },
          alignment: { vertical: 'middle', horizontal: 'center' },
          border: THIN_BORDER,
        });
        return;
      }

      // 4. Empty slot (clean empty cell with thin border)
      styleCell(`${colLetter}${r1}`, { value: '', border: THIN_BORDER });
      styleCell(`${colLetter}${r2}`, { value: '', border: THIN_BORDER });
      styleCell(`${colLetter}${r3}`, { value: '', border: THIN_BORDER });
    });

    currentRow += 3;
  });

  // Blank spacer row
  ws.getRow(currentRow).height = 12;
  currentRow++;

  // ==========================================
  // TABLE A: THEORY & PRACTICAL FACULTY LEGEND
  // ==========================================
  const legHeader1 = currentRow;
  const legHeader2 = currentRow + 1;

  ws.getRow(legHeader1).height = 24;
  ws.getRow(legHeader2).height = 24;

  // Header Row 1
  ws.mergeCells(`A${legHeader1}:A${legHeader2}`);
  styleCell(`A${legHeader1}`, {
    value: 'Subject Code',
    font: { size: 10, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`A${legHeader1}:A${legHeader2}`);

  ws.mergeCells(`B${legHeader1}:C${legHeader1}`);
  styleCell(`B${legHeader1}`, {
    value: 'THEORY SUBJECT',
    font: { size: 10.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`B${legHeader1}:C${legHeader1}`);

  ws.mergeCells(`D${legHeader1}:G${legHeader1}`);
  styleCell(`D${legHeader1}`, {
    value: 'PRACTICAL Faculty Staff Full Name',
    font: { size: 10.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`D${legHeader1}:G${legHeader1}`);

  ws.mergeCells(`H${legHeader1}:J${legHeader1}`);
  styleCell(`H${legHeader1}`, {
    value: 'Supporting Staff',
    font: { size: 10.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`H${legHeader1}:J${legHeader1}`);

  // Header Row 2 Sub-headers
  styleCell(`B${legHeader2}`, { value: 'Subject Name', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  styleCell(`C${legHeader2}`, { value: 'Faculty Name/ Abbr', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  styleCell(`D${legHeader2}`, { value: 'BATCH--A1', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  styleCell(`E${legHeader2}`, { value: 'BATCH--A2', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  styleCell(`F${legHeader2}`, { value: 'BATCH--A3', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  styleCell(`G${legHeader2}`, { value: 'BATCH--A4', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });

  ws.mergeCells(`H${legHeader2}:J${legHeader2}`);
  styleCell(`H${legHeader2}`, { value: 'Staff In-charge', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  borderRange(`H${legHeader2}:J${legHeader2}`);

  currentRow += 2;

  // Populate Legend Data Rows for each subject taught in this class
  const usedSubjectIds = Array.from(new Set(classAssignments.map((a) => a.subjectId).filter(Boolean))) as string[];
  classAssignments.forEach((a) => {
    if (a.labBatches) {
      a.labBatches.forEach((b) => {
        if (b.subjectId && !usedSubjectIds.includes(b.subjectId)) {
          usedSubjectIds.push(b.subjectId);
        }
      });
    }
  });

  const classSubjects = subjects.filter((s) => usedSubjectIds.includes(s.id) || s.semester === cls.semester);

  classSubjects.forEach((s) => {
    const isLab = s.type === 'lab' || s.name.toLowerCase().includes('lab');

    // Find theory faculty assigned
    const theoryAssignment = classAssignments.find((a) => a.subjectId === s.id);
    const theoryFaculty = theoryAssignment
      ? facultyList.find((f) => f.id === theoryAssignment.facultyId)
      : facultyList.find((f) => f.subjectIds.includes(s.id));

    // Find batch lab assignments if any
    let b1Fac = '—';
    let b2Fac = '—';
    let b3Fac = '—';
    let b4Fac = '—';

    if (isLab) {
      const batchAssign = classAssignments.find((a) => a.labBatches && a.labBatches.some((b) => b.subjectId === s.id));
      if (batchAssign && batchAssign.labBatches) {
        const a1 = batchAssign.labBatches.find((b) => b.id === 'A1' && b.subjectId === s.id);
        const a2 = batchAssign.labBatches.find((b) => b.id === 'A2' && b.subjectId === s.id);
        const a3 = batchAssign.labBatches.find((b) => b.id === 'A3' && b.subjectId === s.id);
        const a4 = batchAssign.labBatches.find((b) => b.id === 'A4' && b.subjectId === s.id);

        if (a1) b1Fac = facultyList.find((f) => f.id === a1.facultyId)?.name || '—';
        if (a2) b2Fac = facultyList.find((f) => f.id === a2.facultyId)?.name || '—';
        if (a3) b3Fac = facultyList.find((f) => f.id === a3.facultyId)?.name || '—';
        if (a4) b4Fac = facultyList.find((f) => f.id === a4.facultyId)?.name || '—';
      } else if (theoryFaculty) {
        b1Fac = theoryFaculty.name;
        b2Fac = theoryFaculty.name;
        b3Fac = theoryFaculty.name;
        b4Fac = theoryFaculty.name;
      }
    }

    ws.getRow(currentRow).height = 24;

    styleCell(`A${currentRow}`, { value: s.code, font: { size: 9.5, bold: true }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`B${currentRow}`, { value: s.name, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'left', wrapText: false }, border: THIN_BORDER });
    styleCell(`C${currentRow}`, { value: theoryFaculty ? theoryFaculty.name : '—', font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`D${currentRow}`, { value: isLab ? b1Fac : '—', font: { size: 9, bold: false }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: false }, border: THIN_BORDER });
    styleCell(`E${currentRow}`, { value: isLab ? b2Fac : '—', font: { size: 9, bold: false }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: false }, border: THIN_BORDER });
    styleCell(`F${currentRow}`, { value: isLab ? b3Fac : '—', font: { size: 9, bold: false }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: false }, border: THIN_BORDER });
    styleCell(`G${currentRow}`, { value: isLab ? b4Fac : '—', font: { size: 9, bold: false }, alignment: { vertical: 'middle', horizontal: 'center', wrapText: false }, border: THIN_BORDER });

    ws.mergeCells(`H${currentRow}:J${currentRow}`);
    styleCell(`H${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`H${currentRow}:J${currentRow}`);

    currentRow++;
  });

  // Add Open Elective & MD Minor Course rows
  const extraRows = [
    { code: 'OE-I', name: 'Open Elective -I', faculty: 'Respective Department Faculty' },
    { code: 'MDM-I', name: 'MD Minor Course-I (Software Engg / AR-VR)', faculty: 'Respective Faculty' },
  ];

  extraRows.forEach((ex) => {
    ws.getRow(currentRow).height = 22;
    styleCell(`A${currentRow}`, { value: ex.code, font: { size: 9.5, bold: true }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`B${currentRow}`, { value: ex.name, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'left' }, border: THIN_BORDER });
    styleCell(`C${currentRow}`, { value: ex.faculty, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`D${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`E${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`F${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    styleCell(`G${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });

    ws.mergeCells(`H${currentRow}:J${currentRow}`);
    styleCell(`H${currentRow}`, { value: '—', font: { size: 9 }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`H${currentRow}:J${currentRow}`);

    currentRow++;
  });

  // Spacer row
  ws.getRow(currentRow).height = 10;
  currentRow++;

  // ==========================================
  // TABLE B: BATCH DIVISION & ROLL NUMBER DISTRIBUTION
  // ==========================================
  const batchHeaderRow = currentRow;
  ws.getRow(batchHeaderRow).height = 24;
  ws.mergeCells(`A${batchHeaderRow}:J${batchHeaderRow}`);
  styleCell(`A${batchHeaderRow}`, {
    value: 'STUDENT PRACTICAL BATCHES & ROLL NUMBER DISTRIBUTION',
    font: { size: 10.5, bold: true, color: { argb: COLORS.DARK_TEXT } },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`A${batchHeaderRow}:J${batchHeaderRow}`);
  currentRow++;

  // Sub-header
  const batchSubHeaderRow = currentRow;
  ws.getRow(batchSubHeaderRow).height = 22;
  
  ws.mergeCells(`A${batchSubHeaderRow}:B${batchSubHeaderRow}`);
  styleCell(`A${batchSubHeaderRow}`, { value: 'Batch Identifier', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  borderRange(`A${batchSubHeaderRow}:B${batchSubHeaderRow}`);

  ws.mergeCells(`C${batchSubHeaderRow}:E${batchSubHeaderRow}`);
  styleCell(`C${batchSubHeaderRow}`, { value: 'Roll Number Range', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  borderRange(`C${batchSubHeaderRow}:E${batchSubHeaderRow}`);

  ws.mergeCells(`F${batchSubHeaderRow}:G${batchSubHeaderRow}`);
  styleCell(`F${batchSubHeaderRow}`, { value: 'Student Strength', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  borderRange(`F${batchSubHeaderRow}:G${batchSubHeaderRow}`);

  ws.mergeCells(`H${batchSubHeaderRow}:J${batchSubHeaderRow}`);
  styleCell(`H${batchSubHeaderRow}`, { value: 'Laboratory Group / Session', font: { size: 9.5, bold: true }, fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2F2F2' } }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
  borderRange(`H${batchSubHeaderRow}:J${batchSubHeaderRow}`);
  currentRow++;

  // Batch Rows (A1, A2, A3, A4)
  const batchData = [
    { name: 'Batch A1 (Batch 1)', range: 'Roll No. 01 to 19', count: '19 Students', group: 'Lab Group G1 (Session A)' },
    { name: 'Batch A2 (Batch 2)', range: 'Roll No. 20 to 47', count: '28 Students', group: 'Lab Group G1 (Session B)' },
    { name: 'Batch A3 (Batch 3)', range: 'Roll No. 48 to 66', count: '19 Students', group: 'Lab Group G2 (Session A)' },
    { name: 'Batch A4 (Batch 4)', range: 'Roll No. 67 to ONWARDS', count: 'Remainder', group: 'Lab Group G2 (Session B)' },
  ];

  batchData.forEach((b) => {
    ws.getRow(currentRow).height = 22;

    ws.mergeCells(`A${currentRow}:B${currentRow}`);
    styleCell(`A${currentRow}`, { value: b.name, font: { size: 9.5, bold: true }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`A${currentRow}:B${currentRow}`);

    ws.mergeCells(`C${currentRow}:E${currentRow}`);
    styleCell(`C${currentRow}`, { value: b.range, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`C${currentRow}:E${currentRow}`);

    ws.mergeCells(`F${currentRow}:G${currentRow}`);
    styleCell(`F${currentRow}`, { value: b.count, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`F${currentRow}:G${currentRow}`);

    ws.mergeCells(`H${currentRow}:J${currentRow}`);
    styleCell(`H${currentRow}`, { value: b.group, font: { size: 9.5, bold: false }, alignment: { vertical: 'middle', horizontal: 'center' }, border: THIN_BORDER });
    borderRange(`H${currentRow}:J${currentRow}`);

    currentRow++;
  });

  // Spacer row
  ws.getRow(currentRow).height = 10;
  currentRow++;

  // ==========================================
  // BOTTOM 3 CONTACT / RESPONSIBILITY BOXES
  // ==========================================
  const classTeacher = facultyList.find((f) => f.id === cls.classTeacherId);
  const incharges = facultyList.filter((f) => f.roles?.includes('Timetable Incharge'));
  const inchargeDisplay = incharges.length > 0 ? incharges.map((f) => f.name).join(' / ') : 'Timetable Incharge';
  const hod = facultyList.find((f) => f.roles?.includes('Head of Department (HOD)'));
  const hodDisplay = hod ? hod.name : INSTITUTION_INFO.hodName;

  const boxHeaderRow = currentRow;
  const boxDataRow = currentRow + 1;

  ws.getRow(boxHeaderRow).height = 22;
  ws.getRow(boxDataRow).height = 24;

  // Box 1 Header (Cols A-C)
  ws.mergeCells(`A${boxHeaderRow}:B${boxHeaderRow}`);
  styleCell(`A${boxHeaderRow}`, {
    value: 'Name of Class Teacher',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`A${boxHeaderRow}:B${boxHeaderRow}`);

  styleCell(`C${boxHeaderRow}`, {
    value: 'Contact No.',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // Box 1 Data
  ws.mergeCells(`A${boxDataRow}:B${boxDataRow}`);
  styleCell(`A${boxDataRow}`, {
    value: classTeacher ? classTeacher.name : '—',
    font: { size: 9.5, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`A${boxDataRow}:B${boxDataRow}`);

  styleCell(`C${boxDataRow}`, {
    value: classTeacher?.email || '—',
    font: { size: 9, bold: false },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // Box 2 Header (Cols D-G)
  ws.mergeCells(`D${boxHeaderRow}:F${boxHeaderRow}`);
  styleCell(`D${boxHeaderRow}`, {
    value: 'Time-Table Incharge',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`D${boxHeaderRow}:F${boxHeaderRow}`);

  styleCell(`G${boxHeaderRow}`, {
    value: 'Contact No.',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // Box 2 Data
  ws.mergeCells(`D${boxDataRow}:F${boxDataRow}`);
  styleCell(`D${boxDataRow}`, {
    value: inchargeDisplay,
    font: { size: 9.5, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center', wrapText: false },
    border: THIN_BORDER,
  });
  borderRange(`D${boxDataRow}:F${boxDataRow}`);

  styleCell(`G${boxDataRow}`, {
    value: incharges[0]?.email || '—',
    font: { size: 9, bold: false },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // Box 3 Header (Cols H-J)
  ws.mergeCells(`H${boxHeaderRow}:I${boxHeaderRow}`);
  styleCell(`H${boxHeaderRow}`, {
    value: 'HEAD OF DEPARTMENT',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`H${boxHeaderRow}:I${boxHeaderRow}`);

  styleCell(`J${boxHeaderRow}`, {
    value: 'Contact No.',
    font: { size: 9.5, bold: true },
    fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.GREY_LABEL } },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // Box 3 Data
  ws.mergeCells(`H${boxDataRow}:I${boxDataRow}`);
  styleCell(`H${boxDataRow}`, {
    value: hodDisplay,
    font: { size: 9.5, bold: true },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });
  borderRange(`H${boxDataRow}:I${boxDataRow}`);

  styleCell(`J${boxDataRow}`, {
    value: hod?.email || '—',
    font: { size: 9, bold: false },
    alignment: { vertical: 'middle', horizontal: 'center' },
    border: THIN_BORDER,
  });

  // ==========================================
  // METADATA-LINKED IMMUTABLE WATERMARK FOOTER
  // ==========================================
  const watermarkRow = boxDataRow + 2;
  ws.getRow(watermarkRow).height = 20;
  ws.mergeCells(`A${watermarkRow}:J${watermarkRow}`);
  
  const watermarkCell = ws.getCell(`A${watermarkRow}`);
  // Dynamic formula bound directly to the veryHidden _Slotify_Meta sheet variable
  watermarkCell.value = {
    formula: '_Slotify_Meta!A1',
    result: 'Slotify • A Timetable Allocation System • Created by Muchkundraje Thote',
  };
  watermarkCell.font = { name: 'Arial', size: 9.5, italic: true, bold: true, color: { argb: 'FF555555' } };
  watermarkCell.alignment = { vertical: 'middle', horizontal: 'center' };
  watermarkCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF7F7F7' } };
  watermarkCell.border = THIN_BORDER;
  watermarkCell.protection = { locked: true, hidden: false };
  borderRange(`A${watermarkRow}:J${watermarkRow}`, THIN_BORDER);

  // Embed permanent watermark in Excel page setup footer for printing & PDF export in MS Excel and Google Sheets
  ws.headerFooter = {
    oddFooter: '&C&8&ISlotify • A Timetable Allocation System • Created by Muchkundraje Thote',
    evenFooter: '&C&8&ISlotify • A Timetable Allocation System • Created by Muchkundraje Thote',
    firstFooter: '&C&8&ISlotify • A Timetable Allocation System • Created by Muchkundraje Thote',
  };

  // Enable worksheet protection so watermark and template structure cannot be deleted/tampered with
  await ws.protect('Slotify@MuchkundrajeThote2026', {
    selectLockedCells: true,
    selectUnlockedCells: true,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });

  return ws;
}

/**
 * Robust cross-browser blob download trigger.
 */
function downloadExcelBlob(blob: Blob, filename: string): void {
  try {
    saveAs(blob, filename);
  } catch {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }
}

/**
 * Applies global author metadata, creates a veryHidden metadata sheet, and secures the workbook.
 */
async function initializeProtectedWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
  workbook.creator = 'Slotify • A Timetable Allocation System • Created by Muchkundraje Thote';
  workbook.lastModifiedBy = 'Slotify • Created by Muchkundraje Thote';
  workbook.company = 'Slotify - Muchkundraje Thote';
  workbook.manager = 'Muchkundraje Thote';
  workbook.subject = 'Slotify • A Timetable Allocation System • Created by Muchkundraje Thote';
  workbook.description = 'Slotify • A Timetable Allocation System • Created by Muchkundraje Thote';
  workbook.keywords = 'Slotify, Timetable Allocation System, Muchkundraje Thote, YCCE';
  workbook.category = 'Slotify Institutional Academic Timetable';
  workbook.created = new Date();
  workbook.modified = new Date();

  // Create a locked, veryHidden metadata storage sheet (cannot be unhidden via standard Excel UI)
  const metaSheet = workbook.addWorksheet('_Slotify_Meta', {
    state: 'veryHidden',
  });

  metaSheet.getCell('A1').value = 'Slotify • A Timetable Allocation System • Created by Muchkundraje Thote';
  metaSheet.getCell('A2').value = 'Muchkundraje Thote';
  metaSheet.getCell('A3').value = 'Slotify Secured Timetable Allocation System';
  metaSheet.getCell('A4').value = 'https://github.com/MUCHKUNDRAJE';

  metaSheet.getCell('A1').protection = { locked: true };
  metaSheet.getCell('A2').protection = { locked: true };
  metaSheet.getCell('A3').protection = { locked: true };
  metaSheet.getCell('A4').protection = { locked: true };

  await metaSheet.protect('Slotify@MuchkundrajeThote2026', {
    selectLockedCells: false,
    selectUnlockedCells: false,
    formatCells: false,
    formatColumns: false,
    formatRows: false,
    insertColumns: false,
    insertRows: false,
    insertHyperlinks: false,
    deleteColumns: false,
    deleteRows: false,
    sort: false,
    autoFilter: false,
    pivotTables: false,
  });
}

/**
 * Exports a single class timetable to an Excel (.xlsx) file.
 */
export async function exportClassTimetableToExcel(params: BuildSheetParams, filename?: string): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await initializeProtectedWorkbook(workbook);

    await buildClassWorksheet(workbook, params);

    const safeName = filename || `YCCE_Timetable_${params.cls.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadExcelBlob(blob, `${safeName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to export Excel workbook:', error);
    return false;
  }
}

/**
 * Exports all classes/sections in the department into a single multi-sheet Excel (.xlsx) workbook,
 * where each section gets its own dedicated worksheet formatted identically to the institutional template.
 */
export async function exportAllClassesToExcel(
  classes: CollegeClass[],
  facultyList: Faculty[],
  subjects: Subject[],
  rooms: Room[],
  labs: Lab[],
  assignments: Assignment[],
  academicSession?: string,
  filename?: string
): Promise<boolean> {
  try {
    const workbook = new ExcelJS.Workbook();
    await initializeProtectedWorkbook(workbook);

    if (!classes || classes.length === 0) {
      throw new Error('No class records available for Excel export.');
    }

    // Sort classes by semester and section (e.g. Sem 3 A, Sem 3 B, Sem 5 A...)
    const sortedClasses = [...classes].sort((a, b) => {
      if (a.semester !== b.semester) return a.semester - b.semester;
      return a.section.localeCompare(b.section);
    });

    for (const cls of sortedClasses) {
      await buildClassWorksheet(workbook, {
        cls,
        classes,
        facultyList,
        subjects,
        rooms,
        labs,
        assignments,
        academicSession,
      });
    }

    const safeName = filename || `ALL_SECTIONS_TIMETABLE_YCCE_${(academicSession || '2026-2027').replace(/[^a-zA-Z0-9]/g, '_')}`;
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    downloadExcelBlob(blob, `${safeName}.xlsx`);
    return true;
  } catch (error) {
    console.error('Failed to bulk export Excel workbook:', error);
    return false;
  }
}
