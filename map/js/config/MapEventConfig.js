export const POI_EVENT_TYPES = {
  dorm: { label: '宿舍', canEnter: true, scenes: ['dorm_inside'] },
  classroom: { label: '教学楼', canEnter: true, scenes: ['classroom_inside'] },
  library: { label: '图书馆', canEnter: true, scenes: ['library_inside'] },
  cafeteria: { label: '食堂', canEnter: true, scenes: ['canteen_inside'] },
  stadium: { label: '操场/体育', canEnter: false, scenes: [] },
  club: { label: '社团活动', canEnter: true, scenes: ['club_center_inside'] },
  lab: { label: '实验室', canEnter: true, scenes: ['lab_inside'] },
  gate: { label: '校门', canEnter: false, scenes: [] },
  shop: { label: '商店', canEnter: false, scenes: [] },
  bus: { label: '巴士站', canEnter: false, scenes: [] },
  landmark: { label: '地标', canEnter: false, scenes: [] },
  admin: { label: '行政楼', canEnter: false, scenes: [] },
  default: { label: '地点', canEnter: false, scenes: [] }
};

export const MODULE_ENTRIES = {
  '社团活动中心': { type: 'club', label: '进入社团招新' },
  '大学生活动中心': { type: 'club', label: '进入社团招新' },
  '东操场': { type: 'running', label: '开始跑步' },
  '西操场': { type: 'running', label: '开始跑步' },
  '中操场': { type: 'running', label: '开始跑步' },
  '主图书馆': { type: 'library', label: '进入图书馆' },
  '东园食堂': { type: 'canteen', label: '食堂用餐' },
  '东校区食堂': { type: 'canteen', label: '食堂用餐' },
  '引力实验室': { type: 'lab', label: '参观实验室' }
};

export const SCENE_NPC_OVERRIDES = {
  library_inside: ['librarian'],
  dorm_inside: ['internship_senior'],
  classroom_inside: ['math_teacher', 'thesis_supervisor', 'defense_teacher'],
  club_center_inside: ['club_leader'],
  lab_inside: ['lab_mentor'],
  canteen_inside: ['canteen_auntie']
};

export const POI_QUEST_MAP = {
  24: ['freshman_arrival', 'explore_first'],
  19: ['self_study_library_1', 'self_study_library_2', 'self_study_library_3', 'explore_library_corner'],
  9: ['math_intro', 'second_class_math', 'math_final_exam', 'math2_final_exam', 'probability_final_exam'],
  10: ['thesis_defense', 'graduation'],
  13: ['thesis_preparation', 'thesis_writing'],
  30: ['military_training', 'run_first', 'run_streak_3', 'club_first_activity'],
  31: ['military_training', 'run_fitness_prep', 'run_fitness_test'],
  32: ['run_fitness_prep', 'run_fitness_test'],
  23: ['club_join', 'club_project', 'club_leader', 'club_farewell'],
  1: ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8', 'freshman_1_summary', 'freshman_2_summary', 'sophomore_1_summary', 'sophomore_2_summary', 'junior_1_summary', 'junior_2_summary', 'senior_1_summary', 'senior_2_summary'],
  2: ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8', 'internship', 'internship_prep', 'senior_1_summary'],
  3: ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8'],
  16: ['explore_graduation_route'],
  '东校区CBD': ['explore_canteen_secret'],
  '引力实验室': ['explore_lab'],
  '南大门': ['freshman_arrival', 'explore_first', 'club_farewell'],
  '主图书馆': ['self_study_library_1', 'self_study_library_2', 'self_study_library_3', 'explore_library_corner'],
  '东操场': ['military_training', 'run_first', 'run_streak_3', 'club_first_activity'],
  '中操场': ['military_training', 'run_fitness_prep', 'run_fitness_test'],
  '西操场': ['run_fitness_prep', 'run_fitness_test'],
  '东九教学楼': ['math_intro', 'second_class_math', 'math_final_exam', 'math2_final_exam', 'probability_final_exam', 'major_course_1', 'major1_final_exam', 'major_course_3', 'major3_final_exam'],
  '西十二教学楼': ['thesis_defense', 'graduation', 'major_course_2', 'major2_final_exam', 'major_course_4', 'major4_final_exam', 'internship', 'thesis_preparation'],
  '计算机学院': ['thesis_preparation', 'thesis_writing'],
  '韵苑宿舍': ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8'],
  '沁苑宿舍': ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8'],
  '紫菘宿舍': ['rest_dorm_1', 'rest_dorm_2', 'rest_dorm_3', 'rest_dorm_4', 'rest_dorm_5', 'rest_dorm_6', 'rest_dorm_7', 'rest_dorm_8']
};

export const MapEventConfig = {
  poiEventTypes: POI_EVENT_TYPES,
  moduleEntries: MODULE_ENTRIES,
  sceneNpcOverrides: SCENE_NPC_OVERRIDES,
  poiQuestMap: POI_QUEST_MAP,

  getEventType(type) {
    return this.poiEventTypes[type] || this.poiEventTypes.default;
  },

  getModuleEntry(poiName) {
    return this.moduleEntries[poiName] || null;
  },

  getSceneNpcs(sceneId) {
    return this.sceneNpcOverrides[sceneId] || [];
  },

  getQuestIdsByPoi(poiIdOrName) {
    return this.poiQuestMap[poiIdOrName] || [];
  }
};

export default MapEventConfig;
