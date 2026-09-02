import { CollegeClass, Lab, Room, Subject, Faculty, Assignment } from '@/types/timetable';

export const SEED_CLASSES: CollegeClass[] = [
  { id: 'class_aids_7a', name: 'AIDS 7th Sem A', department: 'Artificial Intelligence & Data Science', semester: 7, section: 'A', studentCount: 64, classTeacherId: 'fac_ananya_sen' },
  { id: 'class_aids_7b', name: 'AIDS 7th Sem B', department: 'Artificial Intelligence & Data Science', semester: 7, section: 'B', studentCount: 62, classTeacherId: 'fac_vikram_patel' },
  { id: 'class_aids_5a', name: 'AIDS 5th Sem A', department: 'Artificial Intelligence & Data Science', semester: 5, section: 'A', studentCount: 68, classTeacherId: 'fac_priya_nair' },
  { id: 'class_aids_3a', name: 'AIDS 3rd Sem A', department: 'Artificial Intelligence & Data Science', semester: 3, section: 'A', studentCount: 70, classTeacherId: 'fac_kiran_khadare' },
];

export const SEED_LABS: Lab[] = [
  { id: 'lab_ai_robotics', name: 'AI & Robotics Lab (EL-002)', capacity: 36, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, East Wing' },
  { id: 'lab_data_analytics', name: 'Data Analytics Lab (EL-004)', capacity: 38, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, East Wing' },
  { id: 'lab_cloud_hpc', name: 'Cloud & HPC Lab (EL-006)', capacity: 40, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, North Wing' },
];

export const SEED_ROOMS: Room[] = [
  { id: 'room_el_202', name: 'EL-202 (Smart Lecture Hall)', capacity: 72, building: 'Engineering Block 2nd Floor', type: 'lecture' },
  { id: 'room_el_301', name: 'EL-301 (Lecture Hall)', capacity: 75, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_el_302', name: 'EL-302', capacity: 70, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_el_303', name: 'EL-303', capacity: 70, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_lh_101', name: 'LH-101 (Tiered Theater)', capacity: 90, building: 'Academic Annex 1st Floor', type: 'seminar' },
  { id: 'room_lh_102', name: 'LH-102', capacity: 80, building: 'Academic Annex 1st Floor', type: 'lecture' },
];

export const SEED_SUBJECTS: Subject[] = [
  { id: 'subj_cs701', name: 'Deep Learning & Neural Nets', code: 'CS701', abbreviation: 'DL', type: 'lecture', color: '#5755FE', department: 'AIDS', semester: 7 },
  { id: 'subj_cs702', name: 'Deep Learning Lab', code: 'CS702', abbreviation: 'DL-Lab', type: 'lab', color: '#FF71CD', department: 'AIDS', semester: 7 },
  { id: 'subj_cs703', name: 'Natural Language Processing', code: 'CS703', abbreviation: 'NLP', type: 'lecture', color: '#8B93FF', department: 'AIDS', semester: 7 },
  { id: 'subj_cs704', name: 'Optimum Theory', code: 'CS704', abbreviation: 'OT', type: 'lecture', color: '#0284C7', department: 'AIDS', semester: 7 },
  { id: 'subj_cs501', name: 'Distributed Systems & Cloud', code: 'CS501', abbreviation: 'DSC', type: 'lecture', color: '#0284C7', department: 'AIDS', semester: 5 },
  { id: 'subj_cs502', name: 'Cloud Computing Lab', code: 'CS502', abbreviation: 'CC-Lab', type: 'lab', color: '#FF71CD', department: 'AIDS', semester: 5 },
  { id: 'subj_cs503', name: 'Machine Learning Principles', code: 'CS503', abbreviation: 'MLP', type: 'lecture', color: '#10B981', department: 'AIDS', semester: 5 },
  { id: 'subj_cs301', name: 'Data Structures & Algorithms', code: 'CS301', abbreviation: 'DSA', type: 'lecture', color: '#D97706', department: 'AIDS', semester: 3 },
  { id: 'subj_cs302', name: 'Data Structures Lab', code: 'CS302', abbreviation: 'DSA-Lab', type: 'lab', color: '#FF71CD', department: 'AIDS', semester: 3 },
];

export const SEED_FACULTY: Faculty[] = [
  {
    id: 'fac_kiran_khadare',
    name: 'Prof. Kiran Khadare',
    nickname: 'KK',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Assistant Professor',
    roles: ['Timetable Incharge'],
    email: 'kiran.khadare@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs704', 'subj_cs501', 'subj_cs301'],
  },
  {
    id: 'fac_sarah_vance',
    name: 'Dr. Sarah Vance',
    nickname: 'SV',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Professor & Dean',
    roles: [],
    email: 'sarah.vance@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs701', 'subj_cs703'],
  },
  {
    id: 'fac_rajesh_raman',
    name: 'Dr. Rajesh Raman',
    nickname: 'RR',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Associate Professor',
    roles: ['Head of Department (HOD)'],
    email: 'rajesh.raman@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs501', 'subj_cs503'],
  },
  {
    id: 'fac_ananya_sen',
    name: 'Prof. Ananya Sen',
    nickname: 'AS',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Assistant Professor',
    roles: ['Timetable Incharge'],
    email: 'ananya.sen@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs301', 'subj_cs501', 'subj_cs502'],
  },
  {
    id: 'fac_vikram_patel',
    name: 'Prof. Vikram Patel',
    nickname: 'VP',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Assistant Professor',
    roles: [],
    email: 'vikram.patel@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs702', 'subj_cs703'],
  },
  {
    id: 'fac_priya_nair',
    name: 'Dr. Priya Nair',
    nickname: 'PN',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Associate Professor',
    roles: [],
    email: 'priya.nair@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs503', 'subj_cs301', 'subj_cs302'],
  },
  {
    id: 'fac_rohan_deshmukh',
    name: 'Prof. Rohan Deshmukh',
    nickname: 'RD',
    department: 'Artificial Intelligence & Data Science',
    designation: 'Assistant Professor',
    roles: ['Timetable Incharge'],
    email: 'rohan.deshmukh@mits.edu',
    maxWeeklyHours: 20,
    subjectIds: ['subj_cs702', 'subj_cs502', 'subj_cs302'],
  },
];

export const SEED_ASSIGNMENTS: Assignment[] = [
  // AIDS 7th Sem A (class_aids_7a)
  {
    id: 'asg_1',
    day: 'Mon',
    startSlot: 0, // 9-10
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_sarah_vance',
    subjectId: 'subj_cs701',
    roomId: 'room_el_301',
  },
  {
    id: 'asg_2',
    day: 'Mon',
    startSlot: 1, // 10-11
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_vikram_patel',
    subjectId: 'subj_cs703',
    roomId: 'room_el_301',
  },
  {
    id: 'asg_3',
    day: 'Mon',
    startSlot: 4, // 1-3 (2 hour lab)
    duration: 2,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_vikram_patel',
    subjectId: 'subj_cs702',
    labId: 'lab_ai_robotics',
    labBatches: [
      { id: 'A1', facultyId: 'fac_vikram_patel', subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
      { id: 'A2', facultyId: 'fac_rohan_deshmukh', subjectId: 'subj_cs702', labId: 'lab_data_analytics' },
      { id: 'A3', facultyId: 'fac_kiran_khadare', subjectId: 'subj_cs704', labId: 'lab_cloud_hpc' },
      { id: 'A4', facultyId: 'fac_priya_nair', subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
    ],
  },
  {
    id: 'asg_4',
    day: 'Tue',
    startSlot: 1, // 10-11
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_sarah_vance',
    subjectId: 'subj_cs701',
    roomId: 'room_el_301',
  },
  {
    id: 'asg_5',
    day: 'Wed',
    startSlot: 0, // 9-10
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_vikram_patel',
    subjectId: 'subj_cs703',
    roomId: 'room_el_301',
  },
  {
    id: 'asg_6',
    day: 'Thu',
    startSlot: 2, // 11-12
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_sarah_vance',
    subjectId: 'subj_cs701',
    roomId: 'room_el_301',
  },
  {
    id: 'asg_7',
    day: 'Fri',
    startSlot: 5, // 2-4 (2 hour lab)
    duration: 2,
    targetType: 'class',
    targetId: 'class_aids_7a',
    facultyId: 'fac_rohan_deshmukh',
    subjectId: 'subj_cs702',
    labId: 'lab_ai_robotics',
    labBatches: [
      { id: 'A1', facultyId: 'fac_rohan_deshmukh', subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
      { id: 'A2', facultyId: 'fac_vikram_patel', subjectId: 'subj_cs702', labId: 'lab_data_analytics' },
      { id: 'A3', facultyId: 'fac_ananya_sen', subjectId: 'subj_cs702', labId: 'lab_cloud_hpc' },
      { id: 'A4', facultyId: 'fac_priya_nair', subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
    ],
  },

  // AIDS 5th Sem A (class_aids_5a)
  {
    id: 'asg_8',
    day: 'Mon',
    startSlot: 2, // 11-12
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_5a',
    facultyId: 'fac_rajesh_raman',
    subjectId: 'subj_cs501',
    roomId: 'room_el_302',
  },
  {
    id: 'asg_9',
    day: 'Tue',
    startSlot: 0, // 9-10
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_5a',
    facultyId: 'fac_priya_nair',
    subjectId: 'subj_cs503',
    roomId: 'room_el_302',
  },
  {
    id: 'asg_10',
    day: 'Wed',
    startSlot: 4, // 1-3 (2 hour lab)
    duration: 2,
    targetType: 'class',
    targetId: 'class_aids_5a',
    facultyId: 'fac_ananya_sen',
    subjectId: 'subj_cs502',
    labId: 'lab_cloud_hpc',
  },
  {
    id: 'asg_11',
    day: 'Thu',
    startSlot: 0, // 9-10
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_5a',
    facultyId: 'fac_rajesh_raman',
    subjectId: 'subj_cs501',
    roomId: 'room_el_302',
  },
  {
    id: 'asg_12',
    day: 'Fri',
    startSlot: 1, // 10-11
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_5a',
    facultyId: 'fac_priya_nair',
    subjectId: 'subj_cs503',
    roomId: 'room_el_302',
  },

  // AIDS 3rd Sem A (class_aids_3a)
  {
    id: 'asg_13',
    day: 'Mon',
    startSlot: 1, // 10-11
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_3a',
    facultyId: 'fac_ananya_sen',
    subjectId: 'subj_cs301',
    roomId: 'room_el_303',
  },
  {
    id: 'asg_14',
    day: 'Tue',
    startSlot: 4, // 1-3 (2 hour lab)
    duration: 2,
    targetType: 'class',
    targetId: 'class_aids_3a',
    facultyId: 'fac_priya_nair',
    subjectId: 'subj_cs302',
    labId: 'lab_data_analytics',
  },
  {
    id: 'asg_15',
    day: 'Wed',
    startSlot: 2, // 11-12
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_3a',
    facultyId: 'fac_ananya_sen',
    subjectId: 'subj_cs301',
    roomId: 'room_el_303',
  },
  {
    id: 'asg_16',
    day: 'Thu',
    startSlot: 1, // 10-11
    duration: 1,
    targetType: 'class',
    targetId: 'class_aids_3a',
    facultyId: 'fac_priya_nair',
    subjectId: 'subj_cs301',
    roomId: 'room_el_303',
  },
];
