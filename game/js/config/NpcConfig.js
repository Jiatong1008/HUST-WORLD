/**
 * NPC 配置模块
 *
 * 新增关系字段说明：
 * - affinity:  与对应 NPC 的默认关系值（默认 0）。
 * - maxAffinity: 与该 NPC 可达到的最大关系值（默认 100）。
 * 已有 relationship 字段保留，用于兼容旧版逻辑；新系统优先使用 affinity / maxAffinity。
 */

export const NPC_ROLE = {
  TEACHER: 'teacher',
  STUDENT: 'student',
  CLUB: 'club',
  SHOP: 'shop',
  MENTOR: 'mentor',
  ADMIN: 'admin',
  COACH: 'coach',
  LIBRARIAN: 'librarian'
};

export const NPC_STATUS = {
  AVAILABLE: 'AVAILABLE',
  HAS_QUEST: 'HAS_QUEST',
  COMPLETABLE: 'COMPLETABLE',
  COMPLETED: 'COMPLETED',
  NORMAL: 'NORMAL'
};

const ALL_PHASES = [
  'freshman_1',
  'freshman_2',
  'sophomore_1',
  'sophomore_2',
  'junior_1',
  'junior_2',
  'senior_1',
  'senior_2'
];

const NPC_CONFIG = {
  volunteer_freshman: {
    npcId: 'volunteer_freshman',
    name: '迎新志愿者',
    title: '迎新学长',
    role: NPC_ROLE.STUDENT,
    avatar: 'student_senior_a',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '南大门',
    poiId: 24,
    sceneId: 'campus',
    availablePhases: ['freshman_1'],
    availableTime: { startHour: 7, endHour: 22 },
    dialogueIds: ['npc_volunteer_freshman'],
    questIds: ['freshman_arrival'],
    sideQuestIds: ['explore_first'],
    relationship: { base: 0, max: 50 },
    affinity: 0,
    maxAffinity: 100
  },
  drill_instructor: {
    npcId: 'drill_instructor',
    name: '军训教官',
    title: '军训总教官',
    role: NPC_ROLE.COACH,
    avatar: 'coach_a',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '东操场',
    poiId: 30,
    sceneId: 'campus',
    availablePhases: ['freshman_1'],
    availableTime: { startHour: 6, endHour: 18 },
    dialogueIds: ['npc_drill_instructor'],
    questIds: ['military_training'],
    relationship: { base: 0, max: 50 },
    affinity: 0,
    maxAffinity: 100
  },
  math_teacher: {
    npcId: 'math_teacher',
    name: '高数老师',
    title: '数学系主讲教师',
    role: NPC_ROLE.TEACHER,
    avatar: 'teacher_a',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '东九教学楼',
    poiId: 9,
    sceneId: 'classroom_inside',
    availablePhases: ['freshman_1', 'freshman_2'],
    availableTime: { startHour: 8, endHour: 18 },
    dialogueIds: ['npc_math_teacher'],
    questIds: ['math_intro', 'second_class_math', 'math_final_exam', 'math2_final_exam', 'probability_final_exam'],
    relationship: { base: 0, max: 80 },
    affinity: 0,
    maxAffinity: 100
  },
  librarian: {
    npcId: 'librarian',
    name: '图书馆管理员',
    title: '参考咨询台',
    role: NPC_ROLE.LIBRARIAN,
    avatar: 'student_senior_b',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '主图书馆',
    poiId: 19,
    sceneId: 'library_inside',
    availablePhases: ALL_PHASES,
    availableTime: { startHour: 8, endHour: 22 },
    dialogueIds: ['npc_librarian'],
    questIds: ['self_study_library_1', 'self_study_library_2', 'self_study_library_3'],
    sideQuestIds: ['explore_library_corner'],
    relationship: { base: 0, max: 60 },
    affinity: 0,
    maxAffinity: 100
  },
  club_leader: {
    npcId: 'club_leader',
    name: '社团负责人',
    title: '社团联合会干事',
    role: NPC_ROLE.CLUB,
    avatar: 'club_leader_a',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '社团活动中心',
    poiId: 23,
    sceneId: 'club_center_inside',
    availablePhases: ALL_PHASES,
    availableTime: { startHour: 10, endHour: 21 },
    dialogueIds: ['npc_club_leader'],
    sideQuestIds: ['club_join', 'club_first_activity', 'club_project', 'club_leader', 'club_farewell'],
    clubId: 'club_center',
    relationship: { base: 0, max: 100 },
    affinity: 0,
    maxAffinity: 100
  },
  running_coach: {
    npcId: 'running_coach',
    name: '跑步教练',
    title: '校田径队教练',
    role: NPC_ROLE.COACH,
    avatar: 'coach_b',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '东操场',
    poiId: 30,
    sceneId: 'campus',
    availablePhases: ALL_PHASES,
    availableTime: { startHour: 6, endHour: 22 },
    dialogueIds: ['npc_running_coach'],
    sideQuestIds: ['run_first', 'run_streak_3', 'run_fitness_prep', 'run_fitness_test', 'run_final_night'],
    relationship: { base: 0, max: 80 },
    affinity: 0,
    maxAffinity: 100
  },
  canteen_auntie: {
    npcId: 'canteen_auntie',
    name: '食堂阿姨',
    title: '窗口打饭阿姨',
    role: NPC_ROLE.SHOP,
    avatar: 'shopkeeper_a',
    fallbackAvatar: 'default_npc_b',
    defaultLocation: '东园食堂',
    poiId: null,
    sceneId: 'canteen_inside',
    availablePhases: ALL_PHASES,
    availableTime: { startHour: 6, endHour: 20 },
    dialogueIds: ['npc_canteen_auntie'],
    sideQuestIds: ['explore_canteen_secret'],
    shopId: 'canteen',
    relationship: { base: 0, max: 60 },
    affinity: 0,
    maxAffinity: 100
  },
  lab_mentor: {
    npcId: 'lab_mentor',
    name: '实验室导师',
    title: '实验室导师',
    role: NPC_ROLE.MENTOR,
    avatar: 'teacher_b',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '引力实验室',
    poiId: null,
    sceneId: 'lab_inside',
    availablePhases: ['sophomore_1', 'sophomore_2', 'junior_1', 'junior_2', 'senior_1', 'senior_2'],
    availableTime: { startHour: 9, endHour: 18 },
    dialogueIds: ['npc_lab_mentor'],
    sideQuestIds: ['explore_lab'],
    relationship: { base: 0, max: 100 },
    affinity: 0,
    maxAffinity: 100
  },
  internship_senior: {
    npcId: 'internship_senior',
    name: '实习学长',
    title: '已拿 offer 的学长',
    role: NPC_ROLE.STUDENT,
    avatar: 'student_senior_c',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '东校区CBD',
    poiId: 2,
    sceneId: 'dorm_inside',
    availablePhases: ['junior_1', 'junior_2', 'senior_1', 'senior_2'],
    availableTime: { startHour: 18, endHour: 23 },
    dialogueIds: ['npc_internship_senior'],
    questIds: ['internship_prep', 'internship'],
    relationship: { base: 0, max: 70 },
    affinity: 0,
    maxAffinity: 100
  },
  thesis_supervisor: {
    npcId: 'thesis_supervisor',
    name: '毕设导师',
    title: '毕业设计指导老师',
    role: NPC_ROLE.MENTOR,
    avatar: 'teacher_b',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '计算机学院',
    poiId: 13,
    sceneId: 'classroom_inside',
    availablePhases: ['senior_1', 'senior_2'],
    availableTime: { startHour: 9, endHour: 17 },
    dialogueIds: ['npc_thesis_supervisor'],
    questIds: ['thesis_preparation', 'thesis_writing', 'thesis_defense'],
    relationship: { base: 0, max: 100 },
    affinity: 0,
    maxAffinity: 100
  },
  defense_teacher: {
    npcId: 'defense_teacher',
    name: '答辩老师',
    title: '答辩委员会老师',
    role: NPC_ROLE.TEACHER,
    avatar: 'teacher_a',
    fallbackAvatar: 'default_npc_a',
    defaultLocation: '西十二教学楼',
    poiId: 10,
    sceneId: 'classroom_inside',
    availablePhases: ['senior_2'],
    availableTime: { startHour: 8, endHour: 18 },
    dialogueIds: ['npc_defense_teacher'],
    questIds: ['thesis_defense', 'graduation'],
    relationship: { base: 0, max: 80 },
    affinity: 0,
    maxAffinity: 100
  },
  shopkeeper: {
    npcId: 'shopkeeper',
    name: '校园超市老板',
    title: '校园超市老板',
    role: NPC_ROLE.SHOP,
    avatar: 'shopkeeper_b',
    fallbackAvatar: 'default_npc_b',
    defaultLocation: '东校区CBD',
    poiId: null,
    sceneId: 'campus',
    availablePhases: ALL_PHASES,
    availableTime: { startHour: 7, endHour: 23 },
    dialogueIds: ['npc_shopkeeper'],
    shopId: 'campus_shop',
    relationship: { base: 0, max: 80 },
    affinity: 0,
    maxAffinity: 100
  }
};

export const NPC_LIST = Object.values(NPC_CONFIG);

export function getNpcById(npcId) {
  return NPC_CONFIG[npcId] || null;
}

export function getNpcsByPoiId(poiId) {
  return NPC_LIST.filter(npc => npc.poiId === poiId);
}

export function getNpcsBySceneId(sceneId) {
  return NPC_LIST.filter(npc => npc.sceneId === sceneId);
}

export function getNpcsByRole(role) {
  return NPC_LIST.filter(npc => npc.role === role);
}

export function getNpcsByQuestId(questId) {
  return NPC_LIST.filter(npc =>
    (npc.questIds || []).includes(questId) ||
    (npc.sideQuestIds || []).includes(questId)
  );
}

export function getNpcsByShopId(shopId) {
  return NPC_LIST.filter(npc => npc.shopId === shopId);
}

export function getNpcsByPhase(phaseId) {
  return NPC_LIST.filter(npc => (npc.availablePhases || []).includes(phaseId));
}

export function getAllNpcIds() {
  return Object.keys(NPC_CONFIG);
}

export default NPC_CONFIG;
