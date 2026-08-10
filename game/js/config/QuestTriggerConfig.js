import { DIALOGUE_NPC_MAP } from './DialogueConfig.js';

/**
 * 任务配置模块
 *
 * 新增 rewards.relations 字段说明：
 * - relations 数组用于配置任务完成后提升的 NPC 关系值。
 * - 每项格式：{ npcId: string, affinity: number }。
 * - 关系值提升同时会触发“关系加成”：每 10 点关系额外 +5% 经验和金币（上限 50%）。
 */

export const QUEST_STATUS = {
  LOCKED: 'LOCKED',
  LOCATION_REACHED: 'LOCATION_REACHED',
  PREREQ_MET: 'PREREQ_MET',
  AVAILABLE: 'AVAILABLE',
  ACTIVE: 'ACTIVE',
  READY_TO_COMPLETE: 'READY_TO_COMPLETE',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  EXPIRED: 'EXPIRED'
};

export const QUEST_TYPE = {
  TRAINING: 'training',
  COURSE: 'course',
  ELECTIVE: 'elective',
  DIALOGUE: 'dialogue',
  SELF_STUDY: 'self_study',
  EXAM: 'exam',
  PRACTICE: 'practice',
  EVENT: 'event',
  CLUB: 'club',
  RUNNING: 'running',
  EXPLORATION: 'exploration',
  ACTIVITY: 'activity',
  MAIN: 'MAIN',
  SIDE: 'SIDE'
};

export const QUEST_CATEGORY = {
  MAIN: 'main',
  SIDE: 'side',
  CLUB: 'club',
  RUNNING: 'running',
  EXPLORATION: 'exploration',
  ACTIVITY: 'activity'
};

export const QUEST_OBJECTIVE_TYPE = {
  TALK_TO_NPC: 'talk_to_npc',
  VISIT_LOCATION: 'visit_location',
  ENTER_SCENE: 'enter_scene',
  COMPLETE_DIALOGUE: 'complete_dialogue',
  JOIN_CLUB: 'join_club',
  ATTEND_ACTIVITY: 'attend_activity',
  RUN_DISTANCE: 'run_distance',
  PASS_EXAM: 'pass_exam',
  COLLECT_ITEM: 'collect_item',
  BUY_ITEM: 'buy_item',
  USE_ITEM: 'use_item',
  INCREASE_STAT: 'increase_stat',
  WAIT_TIME: 'wait_time',
  CUSTOM_EVENT: 'custom_event'
};

export const QUEST_TRIGGER_TYPE = {
  TALK: 'TALK',
  LOCATION: 'LOCATION',
  ACTION: 'ACTION',
  TIME: 'TIME',
  ITEM: 'ITEM',
  STAT: 'STAT'
};

export const SEMESTER_PHASES = [
  { id: 'freshman_1', name: '大一上学期', year: 1, semester: 1 },
  { id: 'freshman_2', name: '大一下学期', year: 1, semester: 2 },
  { id: 'sophomore_1', name: '大二上学期', year: 2, semester: 1 },
  { id: 'sophomore_2', name: '大二下学期', year: 2, semester: 2 },
  { id: 'junior_1', name: '大三上学期', year: 3, semester: 1 },
  { id: 'junior_2', name: '大三下学期', year: 3, semester: 2 },
  { id: 'senior_1', name: '大四上学期', year: 4, semester: 1 },
  { id: 'senior_2', name: '大四下学期', year: 4, semester: 2 }
];

const PHASE_INDEX_BY_ID = Object.fromEntries(SEMESTER_PHASES.map((p, i) => [p.id, i]));

export const COLLEGE_COORDINATES = {
  '计算机科学与技术学院': { x: 4950, y: 2376, mapId: 13, name: '计算机学院' },
  '计算机学院': { x: 4950, y: 2376, mapId: 13, name: '计算机学院' },
  '管理学院': { x: 2954, y: 1518, mapId: 12, name: '管理学院' },
  '电气与电子工程学院': { x: 1609, y: 2311, mapId: 14, name: '电气学院' },
  '电气学院': { x: 1609, y: 2311, mapId: 14, name: '电气学院' },
  '机械科学与工程学院': { x: 3241, y: 1865, mapId: 15, name: '机械学院' },
  '机械学院': { x: 3241, y: 1865, mapId: 15, name: '机械学院' },
  '法学院': { x: 3150, y: 2200, mapId: null, name: '法学院' }
};

export const SPECIAL_LOCATIONS = {
  '东操场': { x: 5115, y: 1937, mapId: 30, name: '东操场', radius: 150 },
  '中操场': { x: 3350, y: 2465, mapId: 31, name: '中心操场', radius: 150 },
  '西操场': { x: 1572, y: 1976, mapId: 32, name: '西操场', radius: 150 },
  '东九教学楼': { x: 4501, y: 1871, mapId: 9, name: '东九教学楼', radius: 100 },
  '西十二教学楼': { x: 1631, y: 2597, mapId: 10, name: '西十二教学楼', radius: 100 },
  '图书馆': { x: 2259, y: 1979, mapId: 19, name: '图书馆', radius: 100 },
  '主图书馆': { x: 2259, y: 1979, mapId: 19, name: '图书馆', radius: 100 },
  '爱因斯坦广场': { x: 5741, y: 1730, mapId: 16, name: '爱因斯坦广场', radius: 100 },
  '南大门': { x: 2526, y: 2773, mapId: 24, name: '南大门', radius: 100 },
  '青年园': { x: 2055, y: 1961, mapId: 17, name: '青年园', radius: 100 },
  '毛主席像': { x: 2526, y: 2773, mapId: 24, name: '毛主席像', radius: 100 },
  '韵苑宿舍': { x: 5419, y: 1534, mapId: 1, name: '韵苑宿舍区', radius: 150 },
  '沁苑宿舍': { x: 3626, y: 1741, mapId: 2, name: '沁苑宿舍区', radius: 150 },
  '紫菘宿舍': { x: 1016, y: 2185, mapId: 3, name: '紫菘宿舍区', radius: 150 },
  '光电国家研究中心': { x: 4950, y: 2376, mapId: 13, name: '光电国家研究中心', radius: 120 },
  '东校区CBD': { x: 2954, y: 1518, mapId: 12, name: '东校区CBD', radius: 100 },
  '大学生活动中心': { x: 2954, y: 1518, mapId: 12, name: '大学生活动中心', radius: 100 },
  '东园食堂': { x: 2954, y: 1518, mapId: 12, name: '东园食堂', radius: 100 },
  '校园超市': { x: 2954, y: 1518, mapId: 12, name: '校园超市', radius: 100 }
};

export const COLLEGE_MILITARY_TRAINING = {
  '计算机科学与技术学院': '中操场',
  '计算机学院': '中操场',
  '管理学院': '东操场',
  '电气与电子工程学院': '西操场',
  '电气学院': '西操场',
  '机械科学与工程学院': '东操场',
  '机械学院': '东操场',
  '法学院': '东操场'
};

export const COLLEGE_TEACHING_BUILDING = {
  '计算机科学与技术学院': '西十二教学楼',
  '计算机学院': '西十二教学楼',
  '管理学院': '东九教学楼',
  '电气与电子工程学院': '西十二教学楼',
  '电气学院': '西十二教学楼',
  '机械科学与工程学院': '东九教学楼',
  '机械学院': '东九教学楼',
  '法学院': '东九教学楼'
};

export const TRIGGER_DISTANCE = {
  BUILDING: 120,
  PLAYGROUND: 150,
  LANDMARK: 100,
  BUS_STOP: 80,
  NPC: 80,
  EXPLORATION: 60,
  EXAM: 120
};

export const SIDE_QUEST_LOCATIONS = {
  '南大门': { x: 2526, y: 2773, mapId: 24, name: '南大门', radius: 100 },
  '青年园': { x: 2055, y: 1961, mapId: 17, name: '青年园', radius: 100 },
  '主图书馆': { x: 2259, y: 1979, mapId: 19, name: '图书馆', radius: 100 },
  '毛主席像': { x: 2526, y: 2773, mapId: 24, name: '毛主席像', radius: 100 },
  '东园食堂': { x: 2954, y: 1518, mapId: 12, name: '东园食堂', radius: 100 },
  '大学生活动中心': { x: 2954, y: 1518, mapId: 12, name: '大学生活动中心', radius: 100 },
  '东校区CBD': { x: 2954, y: 1518, mapId: 12, name: '东校区CBD', radius: 100 },
  '东操场': { x: 5115, y: 1937, mapId: 30, name: '东操场', radius: 150 },
  '光电国家研究中心': { x: 4950, y: 2376, mapId: 13, name: '光电国家研究中心', radius: 120 }
};

export const SIDE_QUEST_STYLE = {
  [QUEST_CATEGORY.CLUB]: { color: '#f59e0b', icon: '⭐', label: '社团' },
  [QUEST_CATEGORY.RUNNING]: { color: '#10b981', icon: '🏃', label: '跑步' },
  [QUEST_CATEGORY.EXPLORATION]: { color: '#3b82f6', icon: '🔍', label: '探索' },
  [QUEST_CATEGORY.ACTIVITY]: { color: '#ec4899', icon: '🎉', label: '活动' },
  [QUEST_CATEGORY.SIDE]: { color: '#60a5fa', icon: '📌', label: '支线' },
  [QUEST_CATEGORY.MAIN]: { color: '#f5c542', icon: '🎯', label: '主线' }
};

function normalizeQuest(quest) {
  return {
    id: quest.id,
    title: quest.title || '未命名任务',
    description: quest.description || '',
    type: quest.type || QUEST_TYPE.MAIN,
    phase: quest.phase || 'freshman_1',
    triggers: quest.triggers || [],
    objectives: quest.objectives || [],
    rewards: quest.rewards || {},
    dialogueId: quest.dialogueId || null,
    npcId: quest.npcId || null,
    requiredPhase: quest.requiredPhase || null,
    requiredQuests: quest.requiredQuests || [],
    sideQuests: quest.sideQuests || [],
    timeLock: quest.timeLock || null,
    locationHint: quest.locationHint || null,
    ...quest
  };
}

export const MAIN_QUESTS = {
  freshman_arrival: normalizeQuest({
    id: 'freshman_arrival',
    title: '初入华中大',
    description: '新生报到日，从南大门进入森林大学，完成注册并领取校园卡。',
    type: QUEST_TYPE.MAIN,
    phase: 'freshman_1',
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'volunteer_freshman' }],
    objectives: [
      { id: 'arrive_gate', description: '抵达南大门', type: 'location', target: '南大门', count: 1 },
      { id: 'register', description: '完成新生注册', type: 'talk', target: 'volunteer_freshman', count: 1 }
    ],
    rewards: { xp: 50, money: 100, items: [{ itemId: 'hust_card', count: 1 }, { itemId: 'notebook', count: 1 }], stats: { social: 3, mood: 5 }, achievements: ['first_step'], relations: [{ npcId: 'volunteer_freshman', affinity: 5 }] },
    dialogueId: 'npc_volunteer_freshman',
    npcId: 'volunteer_freshman',
    locationHint: '南大门'
  }),

  military_training: normalizeQuest({
    id: 'military_training',
    title: '军训历练',
    description: '在华科东操场完成军训，为大学生活打好基础。',
    type: QUEST_TYPE.MAIN,
    phase: 'freshman_1',
    requiredQuests: ['freshman_arrival'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'drill_instructor' }],
    objectives: [
      { id: 'report', description: '向教官报到', type: 'talk', target: 'drill_instructor', count: 1 },
      { id: 'drill', description: '完成训练队列', type: 'action', target: 'drill', count: 3 },
      { id: 'finish', description: '汇报训练成果', type: 'talk', target: 'drill_instructor', count: 1 }
    ],
    rewards: { xp: 80, money: 50, stats: { stamina: 10, willpower: 5 }, achievements: ['willpower_seed'], relations: [{ npcId: 'drill_instructor', affinity: 8 }] },
    dialogueId: 'npc_drill_instructor',
    npcId: 'drill_instructor',
    locationHint: '东操场',
    timeLock: { minPhase: 'freshman_1', maxWeek: 4 }
  }),

  math_intro: normalizeQuest({
    id: 'math_intro',
    title: '高数第一课',
    description: '“四大名补”之首——高等数学。在东九教学楼听课、写作业、去图书馆复习。',
    type: QUEST_TYPE.MAIN,
    phase: 'freshman_2',
    requiredQuests: ['military_training'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'math_teacher' }],
    objectives: [
      { id: 'attend', description: '在东九教学楼上课', type: 'location', target: '东九教学楼', count: 1 },
      { id: 'homework', description: '完成高数作业', type: 'item', target: 'homework', count: 1 },
      { id: 'review_notes', description: '在图书馆复习笔记', type: 'location', target: '主图书馆', count: 1 },
      { id: 'submit', description: '向老师提交作业', type: 'talk', target: 'math_teacher', count: 1 }
    ],
    rewards: { xp: 120, money: 30, stats: { knowledge: 12, mood: 3 }, achievements: ['study_in_hust'], relations: [{ npcId: 'math_teacher', affinity: 5 }] },
    dialogueId: 'npc_math_teacher',
    npcId: 'math_teacher',
    locationHint: '东九教学楼',
    unlocksSubject: '高等数学',
    sideQuests: ['explore_library_corner']
  }),

  math_final_exam: normalizeQuest({
    id: 'math_final_exam',
    title: '期末迎战',
    description: '高数期末考试即将来临，图书馆占座、咖啡续命、刷题到深夜。',
    type: QUEST_TYPE.MAIN,
    phase: 'freshman_2',
    requiredQuests: ['math_intro'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'math_teacher' }],
    objectives: [
      { id: 'study', description: '在图书馆自习3次', type: 'location', target: '主图书馆', count: 3 },
      { id: 'coffee', description: '消耗咖啡提神', type: 'item_consume', target: 'coffee', count: 1 },
      { id: 'exam', description: '完成期末考试', type: 'talk', target: 'math_teacher', count: 1 }
    ],
    rewards: { xp: 200, money: 100, stats: { knowledge: 25, willpower: 10 }, achievements: ['exam_survivor'], relations: [{ npcId: 'math_teacher', affinity: 10 }] },
    dialogueId: 'npc_math_teacher',
    npcId: 'math_teacher',
    locationHint: '主图书馆/东九教学楼',
    examType: 'final',
    subject: '高等数学',
    timeLock: { minPhase: 'freshman_2' }
  }),

  club_join: normalizeQuest({
    id: 'club_join',
    title: '百团大战',
    description: '大学生活动中心社团招新，加入一个社团，认识一群有趣的伙伴。',
    type: QUEST_TYPE.MAIN,
    phase: 'sophomore_1',
    requiredQuests: ['math_final_exam'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'club_leader' }],
    objectives: [
      { id: 'visit_club', description: '前往大学生活动中心', type: 'location', target: '大学生活动中心', count: 1 },
      { id: 'join', description: '加入社团', type: 'talk', target: 'club_leader', count: 1 },
      { id: 'activity', description: '参加一次社团活动', type: 'action', target: 'club_activity', count: 1 }
    ],
    rewards: { xp: 150, money: 50, stats: { social: 15, mood: 8 }, achievements: ['club_star'], relations: [{ npcId: 'club_leader', affinity: 8 }] },
    dialogueId: 'npc_club_leader',
    npcId: 'club_leader',
    locationHint: '大学生活动中心',
    sideQuests: ['club_first_activity']
  }),

  run_first: normalizeQuest({
    id: 'run_first',
    title: '森林大学夜跑',
    description: '在东操场完成第一次夜跑，体验华科人“光马”前的训练节奏。',
    type: QUEST_TYPE.MAIN,
    phase: 'sophomore_2',
    requiredQuests: ['club_join'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'running_coach' }],
    objectives: [
      { id: 'coach', description: '向跑步教练报到', type: 'talk', target: 'running_coach', count: 1 },
      { id: 'run', description: '在东操场夜跑3次', type: 'location', target: '东操场', count: 3 },
      { id: 'fitness', description: '完成体测挑战', type: 'talk', target: 'running_coach', count: 1 }
    ],
    rewards: { xp: 180, money: 60, stats: { stamina: 20, health: 10 }, achievements: ['runner_hust'], relations: [{ npcId: 'running_coach', affinity: 8 }] },
    dialogueId: 'npc_running_coach',
    npcId: 'running_coach',
    locationHint: '东操场',
    sideQuests: ['run_fitness_test']
  }),

  explore_lab: normalizeQuest({
    id: 'explore_lab',
    title: '走进实验室',
    description: '参观光电国家研究中心，记录实验数据，迈出科研第一步。',
    type: QUEST_TYPE.MAIN,
    phase: 'junior_1',
    requiredQuests: ['run_first'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'lab_mentor' }],
    objectives: [
      { id: 'visit_lab', description: '抵达光电国家研究中心', type: 'location', target: '光电国家研究中心', count: 1 },
      { id: 'observe', description: '完成实验室参观', type: 'talk', target: 'lab_mentor', count: 1 },
      { id: 'record', description: '提交实验记录', type: 'item', target: 'lab_record', count: 1 }
    ],
    rewards: { xp: 220, money: 80, stats: { knowledge: 20, willpower: 5 }, achievements: ['lab_rookie'], relations: [{ npcId: 'lab_mentor', affinity: 10 }] },
    dialogueId: 'npc_lab_mentor',
    npcId: 'lab_mentor',
    locationHint: '光电国家研究中心',
    sideQuests: []
  }),

  internship: normalizeQuest({
    id: 'internship',
    title: '实习季',
    description: '在东校区CBD准备简历，向实习学长取经，走向职场第一步。',
    type: QUEST_TYPE.MAIN,
    phase: 'junior_2',
    requiredQuests: ['explore_lab'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'internship_senior' }],
    objectives: [
      { id: 'consult', description: '向实习学长咨询', type: 'talk', target: 'internship_senior', count: 1 },
      { id: 'resume', description: '准备简历', type: 'item', target: 'resume', count: 1 },
      { id: 'cbd', description: '前往东校区CBD', type: 'location', target: '东校区CBD', count: 1 }
    ],
    rewards: { xp: 250, money: 200, stats: { social: 10, knowledge: 10 }, achievements: ['intern_ready'], relations: [{ npcId: 'internship_senior', affinity: 10 }] },
    dialogueId: 'npc_internship_senior',
    npcId: 'internship_senior',
    locationHint: '东校区CBD',
    sideQuests: ['internship_prep']
  }),

  thesis_preparation: normalizeQuest({
    id: 'thesis_preparation',
    title: '毕设开题',
    description: '在管理学院与毕设导师讨论选题，小而精才是华科毕设的通关密码。',
    type: QUEST_TYPE.MAIN,
    phase: 'senior_1',
    requiredQuests: ['internship'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'thesis_supervisor' }],
    objectives: [
      { id: 'topic', description: '确定毕业论文选题', type: 'talk', target: 'thesis_supervisor', count: 1 },
      { id: 'draft', description: '完成论文初稿', type: 'item', target: 'thesis_draft', count: 1 }
    ],
    rewards: { xp: 300, money: 100, stats: { knowledge: 30 }, achievements: ['thesis_knight'], relations: [{ npcId: 'thesis_supervisor', affinity: 10 }] },
    dialogueId: 'npc_thesis_supervisor',
    npcId: 'thesis_supervisor',
    locationHint: '管理学院',
    sideQuests: ['thesis_writing']
  }),

  thesis_defense: normalizeQuest({
    id: 'thesis_defense',
    title: '毕业答辩',
    description: '在西十二教学楼完成毕业答辩，用三分钟讲清四年的努力。',
    type: QUEST_TYPE.MAIN,
    phase: 'senior_2',
    requiredQuests: ['thesis_preparation'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'defense_teacher' }],
    objectives: [
      { id: 'report', description: '参加答辩', type: 'talk', target: 'defense_teacher', count: 1 },
      { id: 'answer', description: '回答评委问题', type: 'action', target: 'defense_answer', count: 1 }
    ],
    rewards: { xp: 500, money: 300, stats: { knowledge: 20, social: 10 }, achievements: ['defense_master'], relations: [{ npcId: 'defense_teacher', affinity: 10 }] },
    dialogueId: 'npc_defense_teacher',
    npcId: 'defense_teacher',
    locationHint: '西十二教学楼'
  }),

  graduation: normalizeQuest({
    id: 'graduation',
    title: '森林大学毕业典礼',
    description: '在毛主席像前合影，完成毕业典礼，正式告别华科。',
    type: QUEST_TYPE.MAIN,
    phase: 'senior_2',
    requiredQuests: ['thesis_defense'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'defense_teacher' }],
    objectives: [
      { id: 'photo', description: '在毛主席像前合影', type: 'location', target: '毛主席像', count: 1 },
      { id: 'ceremony', description: '参加毕业典礼', type: 'talk', target: 'defense_teacher', count: 1 }
    ],
    rewards: { xp: 1000, money: 500, stats: { social: 30, mood: 50 }, achievements: ['hust_graduate'], relations: [{ npcId: 'defense_teacher', affinity: 15 }] },
    dialogueId: 'npc_defense_teacher',
    npcId: 'defense_teacher',
    locationHint: '毛主席像/管理学院',
    timeLock: { minPhase: 'senior_2', minWeek: 12 }
  })
};

export const SIDE_QUESTS = {
  explore_first: normalizeQuest({
    id: 'explore_first',
    title: '森林初探',
    description: '作为新生，探索校园主轴线：南大门、青年园、图书馆、毛主席像。',
    type: QUEST_TYPE.SIDE,
    phase: 'freshman_1',
    requiredQuests: ['freshman_arrival'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.LOCATION, target: '南大门' }],
    objectives: [
      { id: 'south_gate', description: '经过南大门', type: 'location', target: '南大门', count: 1 },
      { id: 'youth_garden', description: '游览青年园', type: 'location', target: '青年园', count: 1 },
      { id: 'library', description: '路过主图书馆', type: 'location', target: '主图书馆', count: 1 },
      { id: 'mao', description: '在毛主席像前停留', type: 'location', target: '毛主席像', count: 1 }
    ],
    rewards: { xp: 60, money: 30, stats: { mood: 5, social: 3 }, achievements: ['campus_explorer'], relations: [{ npcId: 'volunteer_freshman', affinity: 3 }] },
    dialogueId: 'explore_first',
    npcId: 'volunteer_freshman',
    locationHint: '校园中轴线',
    category: QUEST_CATEGORY.EXPLORATION
  }),

  explore_library_corner: normalizeQuest({
    id: 'explore_library_corner',
    title: '图书馆占座先锋',
    description: '在主图书馆找到安静角落并自习，体验华科“学在华科”的氛围。',
    type: QUEST_TYPE.SIDE,
    phase: 'freshman_1',
    requiredQuests: ['math_intro'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.LOCATION, target: '主图书馆' }],
    objectives: [
      { id: 'find_seat', description: '找到自习座位', type: 'location', target: '主图书馆', count: 1 },
      { id: 'study', description: '安静自习2次', type: 'action', target: 'library_study', count: 2 },
      { id: 'save_seat', description: '使用占座书占位（不推荐但真实）', type: 'item', target: 'seat_book', count: 1 }
    ],
    rewards: { xp: 80, money: 20, stats: { knowledge: 8, mood: 2 }, achievements: ['library_hero'], relations: [{ npcId: 'librarian', affinity: 5 }] },
    dialogueId: 'explore_library_corner',
    npcId: 'librarian',
    locationHint: '主图书馆',
    category: QUEST_CATEGORY.EXPLORATION
  }),

  explore_canteen_secret: normalizeQuest({
    id: 'explore_canteen_secret',
    title: '食堂隐藏菜单',
    description: '在东园食堂发现华科老饕才知道的隐藏套餐。',
    type: QUEST_TYPE.SIDE,
    phase: 'freshman_1',
    requiredQuests: ['freshman_arrival'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'canteen_auntie' }],
    objectives: [
      { id: 'talk', description: '与食堂阿姨对话', type: 'talk', target: 'canteen_auntie', count: 1 },
      { id: 'coupon', description: '获得校园美食券', type: 'item', target: 'campus_food_coupon', count: 1 },
      { id: 'eat', description: '品尝隐藏套餐', type: 'item_consume', target: 'hot_dry_noodles', count: 1 }
    ],
    rewards: { xp: 50, money: 15, stats: { stamina: 10, mood: 5 }, achievements: ['canteen_hunter'], relations: [{ npcId: 'canteen_auntie', affinity: 5 }] },
    dialogueId: 'explore_canteen_secret',
    npcId: 'canteen_auntie',
    locationHint: '东园食堂',
    category: QUEST_CATEGORY.ACTIVITY
  }),

  club_first_activity: normalizeQuest({
    id: 'club_first_activity',
    title: '社团破冰',
    description: '参加社团第一次破冰活动，感受华科社团文化。',
    type: QUEST_TYPE.SIDE,
    phase: 'sophomore_1',
    requiredQuests: ['club_join'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.LOCATION, target: '大学生活动中心' }],
    objectives: [
      { id: 'activity', description: '参加社团活动', type: 'action', target: 'club_activity', count: 1 },
      { id: 'badge', description: '获得社团纪念章', type: 'item', target: 'club_badge', count: 1 }
    ],
    rewards: { xp: 70, money: 30, stats: { social: 8, mood: 5 }, relations: [{ npcId: 'club_leader', affinity: 5 }] },
    dialogueId: 'club_first_activity',
    npcId: 'club_leader',
    locationHint: '大学生活动中心',
    category: QUEST_CATEGORY.CLUB
  }),

  run_fitness_test: normalizeQuest({
    id: 'run_fitness_test',
    title: '体测大作战',
    description: '完成华科体测挑战，1000米/800米不再是噩梦。',
    type: QUEST_TYPE.SIDE,
    phase: 'sophomore_2',
    requiredQuests: ['run_first'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'running_coach' }],
    objectives: [
      { id: 'train', description: '在东操场训练3次', type: 'location', target: '东操场', count: 3 },
      { id: 'drink', description: '使用运动饮料补充体能', type: 'item_consume', target: 'sports_drink', count: 1 },
      { id: 'test', description: '完成体测', type: 'talk', target: 'running_coach', count: 1 }
    ],
    rewards: { xp: 100, money: 40, stats: { stamina: 15, health: 10 }, achievements: ['fitness_pass'], relations: [{ npcId: 'running_coach', affinity: 5 }] },
    dialogueId: 'run_fitness_test',
    npcId: 'running_coach',
    locationHint: '东操场',
    category: QUEST_CATEGORY.RUNNING
  }),

  internship_prep: normalizeQuest({
    id: 'internship_prep',
    title: '简历打磨',
    description: '在东校区CBD准备一份简历，为实习季蓄力。',
    type: QUEST_TYPE.SIDE,
    phase: 'junior_1',
    requiredQuests: ['explore_lab'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.LOCATION, target: '东校区CBD' }],
    objectives: [
      { id: 'consult', description: '咨询实习学长', type: 'talk', target: 'internship_senior', count: 1 },
      { id: 'resume', description: '完成简历', type: 'item', target: 'resume', count: 1 }
    ],
    rewards: { xp: 90, money: 50, stats: { knowledge: 5, social: 5 }, relations: [{ npcId: 'internship_senior', affinity: 5 }] },
    dialogueId: 'internship_prep',
    npcId: 'internship_senior',
    locationHint: '东校区CBD',
    category: QUEST_CATEGORY.ACTIVITY
  }),

  thesis_writing: normalizeQuest({
    id: 'thesis_writing',
    title: '论文冲刺',
    description: '在图书馆熬夜写论文，咖啡和热干面是最佳搭档。',
    type: QUEST_TYPE.SIDE,
    phase: 'senior_1',
    requiredQuests: ['thesis_preparation'],
    triggers: [{ type: QUEST_TRIGGER_TYPE.LOCATION, target: '主图书馆' }],
    objectives: [
      { id: 'study', description: '在图书馆自习3次', type: 'location', target: '主图书馆', count: 3 },
      { id: 'coffee', description: '消耗咖啡提神', type: 'item_consume', target: 'coffee', count: 2 },
      { id: 'draft', description: '完成论文初稿', type: 'item', target: 'thesis_draft', count: 1 }
    ],
    rewards: { xp: 150, money: 60, stats: { knowledge: 25, willpower: 10 }, relations: [{ npcId: 'thesis_supervisor', affinity: 5 }] },
    dialogueId: 'thesis_writing',
    npcId: 'thesis_supervisor',
    locationHint: '主图书馆',
    category: QUEST_CATEGORY.ACTIVITY
  }),

  buy_stationery: normalizeQuest({
    id: 'buy_stationery',
    title: '超市补给',
    description: '去校园超市买笔记本，开启学霸模式。',
    type: QUEST_TYPE.SIDE,
    phase: 'freshman_1',
    requiredQuests: [],
    triggers: [{ type: QUEST_TRIGGER_TYPE.TALK, target: 'shopkeeper' }],
    objectives: [
      { id: 'buy', description: '购买笔记本', type: 'buy', target: 'notebook', count: 1 },
      { id: 'receipt', description: '获得收据', type: 'item', target: 'receipt', count: 1 }
    ],
    rewards: { xp: 30, money: 10, stats: { knowledge: 3 } },
    dialogueId: 'npc_shopkeeper',
    npcId: 'shopkeeper',
    locationHint: '校园超市/东校区CBD',
    category: QUEST_CATEGORY.SIDE
  })
};

export const DEFAULT_ACTIVE_QUESTS = ['freshman_arrival'];

export const QUEST_CONFIG = { ...MAIN_QUESTS, ...SIDE_QUESTS };

const PHASE_LAST_QUEST = {
  freshman_1: 'military_training',
  freshman_2: 'math_final_exam',
  sophomore_1: 'club_join',
  sophomore_2: 'run_first',
  junior_1: 'explore_lab',
  junior_2: 'internship',
  senior_1: 'thesis_preparation',
  senior_2: 'graduation'
};

function inferLocationType(hint) {
  if (!hint) return '地标';
  const h = String(hint);
  if (h.includes('操场')) return '操场';
  if (h.includes('图书馆')) return '图书馆';
  if (h.includes('教学楼') || h.includes('东九') || h.includes('西十二') || h.includes('管理学院')) return '教学楼';
  if (h.includes('宿舍')) return '宿舍';
  if (h.includes('食堂') || h.includes('CBD') || h.includes('超市') || h.includes('大活') || h.includes('活动中心')) return '教学楼';
  return '地标';
}

function inferOldType(quest) {
  if (quest.examType === 'final' || quest.subject) return QUEST_TYPE.EXAM;
  if (quest.id === 'military_training') return QUEST_TYPE.TRAINING;
  const objectives = quest.objectives || [];
  for (const o of objectives) {
    if (o.type === 'exam') return QUEST_TYPE.EXAM;
  }
  if (quest.type === QUEST_TYPE.MAIN) {
    if (quest.unlocksSubject) return QUEST_TYPE.DIALOGUE;
    if (quest.id === 'run_first') return QUEST_TYPE.TRAINING;
    if (quest.id === 'graduation') return QUEST_TYPE.EVENT;
    if (quest.id === 'freshman_arrival') return QUEST_TYPE.DIALOGUE;
    return QUEST_TYPE.DIALOGUE;
  }
  const category = quest.category || inferCategory(quest);
  switch (category) {
    case QUEST_CATEGORY.CLUB: return QUEST_TYPE.CLUB;
    case QUEST_CATEGORY.RUNNING: return QUEST_TYPE.RUNNING;
    case QUEST_CATEGORY.EXPLORATION: return QUEST_TYPE.EXPLORATION;
    case QUEST_CATEGORY.ACTIVITY: return QUEST_TYPE.ACTIVITY;
    default: return QUEST_TYPE.EVENT;
  }
}

function inferCategory(quest) {
  if (quest.type === QUEST_TYPE.MAIN || quest.type === 'MAIN') return QUEST_CATEGORY.MAIN;
  if (quest.category) return quest.category;
  const id = quest.id || '';
  if (id.includes('club')) return QUEST_CATEGORY.CLUB;
  if (id.includes('run') || id.includes('fitness')) return QUEST_CATEGORY.RUNNING;
  if (id.includes('explore')) return QUEST_CATEGORY.EXPLORATION;
  if (id.includes('canteen') || id.includes('food') || id.includes('buy') || id.includes('thesis_writing') || id.includes('internship_prep')) return QUEST_CATEGORY.ACTIVITY;
  return QUEST_CATEGORY.SIDE;
}

/**
 * 规范化任务奖励对象，统一 experience / money / 属性 / 物品 / 关系等字段。
 * @param {Object} rewards - 原始奖励配置
 * @returns {Object} 规范化后的奖励对象
 */
export function normalizeRewards(rewards = {}) {
  const stats = rewards.stats || {};
  return {
    experience: rewards.xp || rewards.experience || 0,
    gold: rewards.money || rewards.gold || 0,
    money: rewards.money || rewards.gold || 0,
    knowledge: stats.knowledge || rewards.knowledge || 0,
    social: stats.social || rewards.social || 0,
    stamina: stats.stamina || rewards.stamina || 0,
    mood: stats.mood || rewards.mood || 0,
    willpower: stats.willpower || rewards.willpower || 0,
    physical: stats.physical || rewards.physical || 0,
    health: stats.health || rewards.health || 0,
    items: rewards.items || [],
    achievements: rewards.achievements || [],
    proficiencyGain: rewards.proficiencyGain || null,
    unlockSkills: rewards.unlockSkills || [],
    unlockScenes: rewards.unlockScenes || [],
    unlockNpcDialogues: rewards.unlockNpcDialogues || [],
    unlockQuests: rewards.unlockQuests || [],
    relations: rewards.relations || []
  };
}

function toOldSchema(quest, phaseId) {
  const type = inferOldType(quest);
  const category = inferCategory(quest);
  const locationHint = quest.locationHint || '';
  const locationType = inferLocationType(locationHint);
  const locationName = locationHint.split('/')[0].trim() || locationType;
  const rewards = normalizeRewards(quest.rewards || {});

  const objectives = (quest.objectives || []).map(o => ({
    id: o.id,
    description: o.description,
    type: o.type === 'talk' ? QUEST_OBJECTIVE_TYPE.TALK_TO_NPC
      : o.type === 'location' ? QUEST_OBJECTIVE_TYPE.VISIT_LOCATION
      : o.type === 'item' ? QUEST_OBJECTIVE_TYPE.COLLECT_ITEM
      : o.type === 'item_consume' ? QUEST_OBJECTIVE_TYPE.USE_ITEM
      : o.type === 'buy' ? QUEST_OBJECTIVE_TYPE.BUY_ITEM
      : o.type === 'action' ? QUEST_OBJECTIVE_TYPE.CUSTOM_EVENT
      : o.type || QUEST_OBJECTIVE_TYPE.CUSTOM_EVENT,
    target: o.target,
    amount: o.count || 1,
    count: o.count || 1,
    current: 0
  }));

  return {
    id: quest.id,
    name: quest.title,
    title: quest.title,
    description: quest.description,
    type,
    category,
    phase: phaseId || quest.phase,
    locationType,
    locationName,
    prerequisites: quest.requiredQuests || [],
    requiredPhase: quest.requiredPhase || null,
    timeLock: quest.timeLock || null,
    triggers: quest.triggers || [],
    objectives,
    rewards,
    items: rewards.items,
    achievements: rewards.achievements,
    npcId: quest.npcId || null,
    dialogueId: quest.dialogueId || null,
    dialogueNpc: quest.dialogueId || null,
    unlocksSubject: quest.unlocksSubject || null,
    examType: quest.examType || null,
    subject: quest.subject || null,
    timeCost: quest.timeCost || null,
    completesPhase: PHASE_LAST_QUEST[phaseId || quest.phase] === quest.id,
    sideRequirements: quest.sideRequirements || {},
    internalGoal: quest.internalGoal || {},
    locationHint,
    _original: quest
  };
}

function buildMainQuestConfig() {
  const config = {};
  for (const phase of SEMESTER_PHASES) {
    config[phase.id] = { id: phase.id, name: phase.name, quests: [] };
  }
  for (const quest of Object.values(MAIN_QUESTS)) {
    const phaseId = quest.phase || 'freshman_1';
    if (config[phaseId]) {
      config[phaseId].quests.push(toOldSchema(quest, phaseId));
    }
  }
  return config;
}

function buildSideQuestConfig() {
  const config = {};
  for (const quest of Object.values(SIDE_QUESTS)) {
    config[quest.id] = toOldSchema(quest, quest.phase);
  }
  return config;
}

export const MAIN_QUEST_CONFIG = buildMainQuestConfig();

export const SIDE_QUEST_CONFIG = buildSideQuestConfig();

export const SIDE_QUEST_GROUPS = {
  club: ['club_first_activity'],
  running: ['run_fitness_test'],
  exploration: ['explore_first', 'explore_library_corner'],
  activity: ['explore_canteen_secret', 'internship_prep', 'thesis_writing', 'buy_stationery'],
  side: []
};

export function getQuestById(questId) {
  for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
    const quest = phase.quests.find(q => q.id === questId);
    if (quest) return { phase, quest };
  }
  const side = SIDE_QUEST_CONFIG[questId];
  if (side) {
    const phase = SEMESTER_PHASES.find(p => p.id === side.phase) || { id: side.phase, name: side.phase, year: 0, semester: 0 };
    return { phase, quest: side };
  }
  return null;
}

export function getQuestsByPhase(phase) {
  return Object.values(QUEST_CONFIG).filter(quest => quest.phase === phase);
}

export function getQuestsByType(type) {
  return Object.values(QUEST_CONFIG).filter(quest => quest.type === type);
}

export function getMainQuests() {
  return Object.values(MAIN_QUESTS);
}

export function getSideQuests() {
  return Object.values(SIDE_QUESTS);
}

export function getQuestDialogueId(questId) {
  const quest = QUEST_CONFIG[questId];
  if (!quest) return null;
  if (quest.dialogueId) return quest.dialogueId;
  const npcId = quest.npcId || DIALOGUE_NPC_MAP[questId];
  return npcId ? `npc_${npcId}` : null;
}

export function getQuestsByNpcId(npcId) {
  return Object.values(QUEST_CONFIG).filter(quest => quest.npcId === npcId);
}

export function getNextMainQuest(currentQuestId) {
  const mainQuestIds = Object.keys(MAIN_QUESTS);
  const currentIndex = mainQuestIds.indexOf(currentQuestId);
  if (currentIndex === -1 || currentIndex === mainQuestIds.length - 1) return null;
  return MAIN_QUESTS[mainQuestIds[currentIndex + 1]];
}

export function getRequiredQuests(questId) {
  const quest = QUEST_CONFIG[questId];
  return (quest?.requiredQuests || []).map(id => QUEST_CONFIG[id]).filter(Boolean);
}

export function getAllQuests() {
  const quests = [];
  for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
    quests.push(...phase.quests);
  }
  return quests;
}

export function normalizeQuestConfig(quest, options = {}) {
  if (!quest) return null;
  const phaseId = options.phase || quest.phase || 'freshman_1';
  if (quest._original) return { ...quest, phase: phaseId };
  return toOldSchema(quest, phaseId);
}

export function getNormalizedQuestById(questId) {
  const result = getQuestById(questId);
  if (!result) return null;
  return normalizeQuestConfig(result.quest, { phase: result.phase?.id });
}

export function getAllNormalizedQuests() {
  const result = [];
  for (const phase of Object.values(MAIN_QUEST_CONFIG)) {
    for (const quest of phase.quests) {
      result.push(normalizeQuestConfig(quest, { phase: phase.id }));
    }
  }
  for (const quest of Object.values(SIDE_QUEST_CONFIG)) {
    result.push(normalizeQuestConfig(quest));
  }
  return result;
}

/**
 * 解析任务目标地点，优先按学院、地点类型、地点名称等规则匹配 SPECIAL_LOCATIONS。
 * @param {Object} quest - 任务对象
 * @param {string} characterCollege - 玩家所属学院
 * @returns {{ x: number, y: number, mapId: number, name: string } | null} 世界坐标与地点信息
 */
export function resolveQuestLocation(quest, characterCollege) {
  const college = characterCollege || '计算机科学与技术学院';
  const q = quest._original || quest;

  if (q.locationType) {
    if (q.locationType === '操场') {
      const playgroundName = COLLEGE_MILITARY_TRAINING[college] || '东操场';
      const loc = SPECIAL_LOCATIONS[playgroundName];
      if (loc) return { ...loc, name: playgroundName };
    }
    if (q.locationType === '教学楼') {
      const buildingName = COLLEGE_TEACHING_BUILDING[college] || '东九教学楼';
      const loc = SPECIAL_LOCATIONS[buildingName];
      if (loc) return { ...loc, name: buildingName };
    }
    if (q.locationType === '图书馆') {
      const loc = SPECIAL_LOCATIONS['图书馆'];
      if (loc) return { ...loc, name: '图书馆' };
    }
  }

  if (q.locationName && SPECIAL_LOCATIONS[q.locationName]) {
    return SPECIAL_LOCATIONS[q.locationName];
  }

  if (q.locationHint) {
    const hints = String(q.locationHint).split('/').map(s => s.trim());
    for (const hint of hints) {
      if (SPECIAL_LOCATIONS[hint]) return SPECIAL_LOCATIONS[hint];
    }
  }

  if (quest.location && quest.location.x !== undefined && quest.location.y !== undefined) {
    return { x: quest.location.x, y: quest.location.y, mapId: quest.location.mapId || null, name: quest.location.name || quest.locationName };
  }

  return null;
}

/**
 * 计算两点之间的欧几里得距离。
 * @param {number} x1
 * @param {number} y1
 * @param {number} x2
 * @param {number} y2
 * @returns {number}
 */
export function distanceBetween(x1, y1, x2, y2) {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/**
 * 判断玩家是否已到达指定任务地点的触发范围内。
 * @param {number} playerX
 * @param {number} playerY
 * @param {Object} location - 目标地点，含 x、y
 * @param {number} threshold - 触发半径
 * @returns {boolean}
 */
export function isPlayerAtLocation(playerX, playerY, location, threshold) {
  if (!location) return false;
  const dist = distanceBetween(playerX, playerY, location.x, location.y);
  return dist <= (threshold || TRIGGER_DISTANCE.BUILDING);
}

/**
 * 根据任务类型获取对应的默认触发距离。
 * @param {string} questType - QUEST_TYPE 中的类型
 * @returns {number} 触发半径
 */
export function getTriggerDistance(questType) {
  switch (questType) {
    case QUEST_TYPE.TRAINING: return TRIGGER_DISTANCE.PLAYGROUND;
    case QUEST_TYPE.EXAM: return TRIGGER_DISTANCE.EXAM;
    case QUEST_TYPE.EVENT: return TRIGGER_DISTANCE.LANDMARK;
    case QUEST_TYPE.SELF_STUDY: return TRIGGER_DISTANCE.BUILDING;
    case QUEST_TYPE.RUNNING: return TRIGGER_DISTANCE.PLAYGROUND;
    case QUEST_TYPE.EXPLORATION: return TRIGGER_DISTANCE.EXPLORATION;
    case QUEST_TYPE.CLUB: return TRIGGER_DISTANCE.BUILDING;
    case QUEST_TYPE.ACTIVITY: return TRIGGER_DISTANCE.BUILDING;
    default: return TRIGGER_DISTANCE.BUILDING;
  }
}

/**
 * 检查任务时间锁要求是否满足。
 * @param {Object} quest - 任务对象（或包含 _original / timeLock）
 * @param {Object} gameTime - 当前游戏时间 { year, semester, week, day, hour, phase? }
 * @returns {{ met: boolean, reason: string }} 是否满足及未满足原因
 */
export function checkTimeRequirements(quest, gameTime) {
  const q = quest._original || quest;
  const timeLock = q.timeLock || quest.timeLock || null;
  if (!timeLock) return { met: true, reason: '' };

  const currentPhase = gameTime?.phase || 'freshman_1';
  const currentPhaseIndex = PHASE_INDEX_BY_ID[currentPhase] ?? 0;
  const currentWeek = gameTime?.week || 1;
  const currentDay = gameTime?.day || 1;
  const currentHour = gameTime?.hour || 8;

  if (timeLock.minPhase) {
    const minIndex = PHASE_INDEX_BY_ID[timeLock.minPhase];
    if (minIndex !== undefined && currentPhaseIndex < minIndex) {
      return { met: false, reason: '学期阶段未解锁' };
    }
  }
  if (timeLock.maxPhase) {
    const maxIndex = PHASE_INDEX_BY_ID[timeLock.maxPhase];
    if (maxIndex !== undefined && currentPhaseIndex > maxIndex) {
      return { met: false, reason: '已超过可用阶段' };
    }
  }
  if (timeLock.minWeek && currentWeek < timeLock.minWeek) {
    return { met: false, reason: `需第 ${timeLock.minWeek} 周及以后` };
  }
  if (timeLock.maxWeek && currentWeek > timeLock.maxWeek) {
    return { met: false, reason: `需第 ${timeLock.maxWeek} 周及以前` };
  }
  if (timeLock.minDay && currentDay < timeLock.minDay) {
    return { met: false, reason: '日期未满足' };
  }
  if (timeLock.maxDay && currentDay > timeLock.maxDay) {
    return { met: false, reason: '日期已过期' };
  }
  if (timeLock.minHour && currentHour < timeLock.minHour) {
    return { met: false, reason: '时间太早' };
  }
  if (timeLock.maxHour && currentHour > timeLock.maxHour) {
    return { met: false, reason: '时间太晚' };
  }
  return { met: true, reason: '' };
}

/**
 * 生成任务推荐属性文本，用于 UI 展示任务奖励倾向。
 * @param {Object} quest - 任务对象
 * @returns {string}
 */
export function getQuestRecommendedStatsText(quest) {
  const q = quest._original || quest;
  const rewards = normalizeRewards(q.rewards || {});
  const parts = [];
  if (rewards.knowledge) parts.push(`知识 ${rewards.knowledge}`);
  if (rewards.social) parts.push(`社交 ${rewards.social}`);
  if (rewards.stamina || rewards.physical) parts.push(`体能 ${rewards.stamina || rewards.physical}`);
  if (rewards.willpower) parts.push(`意志 ${rewards.willpower}`);
  return parts.length ? parts.join(' / ') : '无特殊要求';
}

export default QUEST_CONFIG;
