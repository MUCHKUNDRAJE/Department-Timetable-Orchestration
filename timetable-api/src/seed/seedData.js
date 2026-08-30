'use strict';

// ================================================================
// Seed Data — mirrors src/lib/seed-data.ts exactly (same IDs)
// Used by: POST /api/data/reset
// ================================================================

const SEED_CLASSES = [
  { id: 'class_aids_7a', name: 'AIDS 7th Sem A', department: 'Artificial Intelligence & Data Science', semester: 7, section: 'A', studentCount: 64 },
  { id: 'class_aids_7b', name: 'AIDS 7th Sem B', department: 'Artificial Intelligence & Data Science', semester: 7, section: 'B', studentCount: 62 },
  { id: 'class_aids_5a', name: 'AIDS 5th Sem A', department: 'Artificial Intelligence & Data Science', semester: 5, section: 'A', studentCount: 68 },
  { id: 'class_aids_3a', name: 'AIDS 3rd Sem A', department: 'Artificial Intelligence & Data Science', semester: 3, section: 'A', studentCount: 70 },
];

const SEED_LABS = [
  { id: 'lab_ai_robotics',    name: 'AI & Robotics Lab (EL-002)',      capacity: 36, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, East Wing' },
  { id: 'lab_data_analytics', name: 'Data Analytics Lab (EL-004)',     capacity: 38, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, East Wing' },
  { id: 'lab_cloud_hpc',      name: 'Cloud & HPC Lab (EL-006)',        capacity: 40, department: 'Artificial Intelligence & Data Science', location: 'Ground Floor, North Wing' },
];

const SEED_ROOMS = [
  { id: 'room_el_202', name: 'EL-202 (Smart Lecture Hall)', capacity: 72, building: 'Engineering Block 2nd Floor', type: 'lecture' },
  { id: 'room_el_301', name: 'EL-301 (Lecture Hall)',        capacity: 75, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_el_302', name: 'EL-302',                       capacity: 70, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_el_303', name: 'EL-303',                       capacity: 70, building: 'Engineering Block 3rd Floor', type: 'lecture' },
  { id: 'room_lh_101', name: 'LH-101 (Tiered Theater)',      capacity: 90, building: 'Academic Annex 1st Floor',   type: 'seminar' },
  { id: 'room_lh_102', name: 'LH-102',                       capacity: 80, building: 'Academic Annex 1st Floor',   type: 'lecture' },
];

const SEED_SUBJECTS = [
  { id: 'subj_cs701', name: 'Deep Learning & Neural Nets',    code: 'CS701', type: 'lecture', color: '#5755FE', department: 'AIDS', semester: 7 },
  { id: 'subj_cs702', name: 'Deep Learning Lab',              code: 'CS702', type: 'lab',     color: '#FF71CD', department: 'AIDS', semester: 7 },
  { id: 'subj_cs703', name: 'Natural Language Processing',    code: 'CS703', type: 'lecture', color: '#8B93FF', department: 'AIDS', semester: 7 },
  { id: 'subj_cs704', name: 'Optimum Theory',                 code: 'CS704', type: 'lecture', color: '#0284C7', department: 'AIDS', semester: 7 },
  { id: 'subj_cs501', name: 'Distributed Systems & Cloud',    code: 'CS501', type: 'lecture', color: '#0284C7', department: 'AIDS', semester: 5 },
  { id: 'subj_cs502', name: 'Cloud Computing Lab',            code: 'CS502', type: 'lab',     color: '#FF71CD', department: 'AIDS', semester: 5 },
  { id: 'subj_cs503', name: 'Machine Learning Principles',    code: 'CS503', type: 'lecture', color: '#10B981', department: 'AIDS', semester: 5 },
  { id: 'subj_cs301', name: 'Data Structures & Algorithms',   code: 'CS301', type: 'lecture', color: '#D97706', department: 'AIDS', semester: 3 },
  { id: 'subj_cs302', name: 'Data Structures Lab',            code: 'CS302', type: 'lab',     color: '#FF71CD', department: 'AIDS', semester: 3 },
];

const SEED_FACULTY = [
  { id: 'fac_kiran_khadare',   name: 'Prof. Kiran Khadare',   nickname: 'KK', department: 'Artificial Intelligence & Data Science', designation: 'Assistant Professor',         email: 'kiran.khadare@mits.edu',   maxWeeklyHours: 20, subjectIds: ['subj_cs704', 'subj_cs501', 'subj_cs301'] },
  { id: 'fac_sarah_vance',     name: 'Dr. Sarah Vance',       nickname: 'SV', department: 'Artificial Intelligence & Data Science', designation: 'Professor & Dean',             email: 'sarah.vance@mits.edu',     maxWeeklyHours: 20, subjectIds: ['subj_cs701', 'subj_cs703'] },
  { id: 'fac_rajesh_raman',    name: 'Dr. Rajesh Raman',      nickname: 'RR', department: 'Artificial Intelligence & Data Science', designation: 'Associate Professor & HOD',   email: 'rajesh.raman@mits.edu',    maxWeeklyHours: 20, subjectIds: ['subj_cs501', 'subj_cs503'] },
  { id: 'fac_ananya_sen',      name: 'Prof. Ananya Sen',      nickname: 'AS', department: 'Artificial Intelligence & Data Science', designation: 'Assistant Professor',         email: 'ananya.sen@mits.edu',      maxWeeklyHours: 20, subjectIds: ['subj_cs301', 'subj_cs501', 'subj_cs502'] },
  { id: 'fac_vikram_patel',    name: 'Prof. Vikram Patel',    nickname: 'VP', department: 'Artificial Intelligence & Data Science', designation: 'Assistant Professor',         email: 'vikram.patel@mits.edu',    maxWeeklyHours: 20, subjectIds: ['subj_cs702', 'subj_cs703'] },
  { id: 'fac_priya_nair',      name: 'Dr. Priya Nair',        nickname: 'PN', department: 'Artificial Intelligence & Data Science', designation: 'Associate Professor',         email: 'priya.nair@mits.edu',      maxWeeklyHours: 20, subjectIds: ['subj_cs503', 'subj_cs301', 'subj_cs302'] },
  { id: 'fac_rohan_deshmukh',  name: 'Prof. Rohan Deshmukh',  nickname: 'RD', department: 'Artificial Intelligence & Data Science', designation: 'Assistant Professor',         email: 'rohan.deshmukh@mits.edu',  maxWeeklyHours: 20, subjectIds: ['subj_cs702', 'subj_cs502', 'subj_cs302'] },
];

const SEED_ASSIGNMENTS = [
  // AIDS 7th Sem A
  { id: 'asg_1',  day: 'Mon', startSlot: 0, duration: 1, targetType: 'class', targetId: 'class_aids_7a', facultyId: 'fac_sarah_vance',    subjectId: 'subj_cs701', roomId: 'room_el_301', labId: null, labBatches: [] },
  { id: 'asg_2',  day: 'Mon', startSlot: 1, duration: 1, targetType: 'class', targetId: 'class_aids_7a', facultyId: 'fac_vikram_patel',   subjectId: 'subj_cs703', roomId: 'room_el_301', labId: null, labBatches: [] },
  {
    id: 'asg_3', day: 'Mon', startSlot: 4, duration: 2, targetType: 'class', targetId: 'class_aids_7a',
    facultyId: 'fac_vikram_patel', subjectId: 'subj_cs702', roomId: null, labId: 'lab_ai_robotics',
    labBatches: [
      { id: 'A1', facultyId: 'fac_vikram_patel',   subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
      { id: 'A2', facultyId: 'fac_rohan_deshmukh', subjectId: 'subj_cs702', labId: 'lab_data_analytics' },
      { id: 'A3', facultyId: 'fac_kiran_khadare',  subjectId: 'subj_cs704', labId: 'lab_cloud_hpc' },
      { id: 'A4', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
    ],
  },
  { id: 'asg_4',  day: 'Tue', startSlot: 1, duration: 1, targetType: 'class', targetId: 'class_aids_7a', facultyId: 'fac_sarah_vance',    subjectId: 'subj_cs701', roomId: 'room_el_301', labId: null, labBatches: [] },
  { id: 'asg_5',  day: 'Wed', startSlot: 0, duration: 1, targetType: 'class', targetId: 'class_aids_7a', facultyId: 'fac_vikram_patel',   subjectId: 'subj_cs703', roomId: 'room_el_301', labId: null, labBatches: [] },
  { id: 'asg_6',  day: 'Thu', startSlot: 2, duration: 1, targetType: 'class', targetId: 'class_aids_7a', facultyId: 'fac_sarah_vance',    subjectId: 'subj_cs701', roomId: 'room_el_301', labId: null, labBatches: [] },
  {
    id: 'asg_7', day: 'Fri', startSlot: 5, duration: 2, targetType: 'class', targetId: 'class_aids_7a',
    facultyId: 'fac_rohan_deshmukh', subjectId: 'subj_cs702', roomId: null, labId: 'lab_ai_robotics',
    labBatches: [
      { id: 'A1', facultyId: 'fac_rohan_deshmukh', subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
      { id: 'A2', facultyId: 'fac_vikram_patel',   subjectId: 'subj_cs702', labId: 'lab_data_analytics' },
      { id: 'A3', facultyId: 'fac_ananya_sen',     subjectId: 'subj_cs702', labId: 'lab_cloud_hpc' },
      { id: 'A4', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs702', labId: 'lab_ai_robotics' },
    ],
  },
  // AIDS 5th Sem A
  { id: 'asg_8',  day: 'Mon', startSlot: 2, duration: 1, targetType: 'class', targetId: 'class_aids_5a', facultyId: 'fac_rajesh_raman',   subjectId: 'subj_cs501', roomId: 'room_el_302', labId: null, labBatches: [] },
  { id: 'asg_9',  day: 'Tue', startSlot: 0, duration: 1, targetType: 'class', targetId: 'class_aids_5a', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs503', roomId: 'room_el_302', labId: null, labBatches: [] },
  { id: 'asg_10', day: 'Wed', startSlot: 4, duration: 2, targetType: 'class', targetId: 'class_aids_5a', facultyId: 'fac_ananya_sen',     subjectId: 'subj_cs502', roomId: null, labId: 'lab_cloud_hpc', labBatches: [] },
  { id: 'asg_11', day: 'Thu', startSlot: 0, duration: 1, targetType: 'class', targetId: 'class_aids_5a', facultyId: 'fac_rajesh_raman',   subjectId: 'subj_cs501', roomId: 'room_el_302', labId: null, labBatches: [] },
  { id: 'asg_12', day: 'Fri', startSlot: 1, duration: 1, targetType: 'class', targetId: 'class_aids_5a', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs503', roomId: 'room_el_302', labId: null, labBatches: [] },
  // AIDS 3rd Sem A
  { id: 'asg_13', day: 'Mon', startSlot: 1, duration: 1, targetType: 'class', targetId: 'class_aids_3a', facultyId: 'fac_ananya_sen',     subjectId: 'subj_cs301', roomId: 'room_el_303', labId: null, labBatches: [] },
  { id: 'asg_14', day: 'Tue', startSlot: 4, duration: 2, targetType: 'class', targetId: 'class_aids_3a', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs302', roomId: null, labId: 'lab_data_analytics', labBatches: [] },
  { id: 'asg_15', day: 'Wed', startSlot: 2, duration: 1, targetType: 'class', targetId: 'class_aids_3a', facultyId: 'fac_ananya_sen',     subjectId: 'subj_cs301', roomId: 'room_el_303', labId: null, labBatches: [] },
  { id: 'asg_16', day: 'Thu', startSlot: 1, duration: 1, targetType: 'class', targetId: 'class_aids_3a', facultyId: 'fac_priya_nair',     subjectId: 'subj_cs301', roomId: 'room_el_303', labId: null, labBatches: [] },
];

module.exports = { SEED_CLASSES, SEED_LABS, SEED_ROOMS, SEED_SUBJECTS, SEED_FACULTY, SEED_ASSIGNMENTS };
