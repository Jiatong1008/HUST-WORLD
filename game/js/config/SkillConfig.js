/**
 * SkillConfig.js
 * 技能与熟练度核心配置：定义技能类别、技能条目、效果与解锁条件。
 */

export const SKILL_CATEGORY = {
  STUDY: 'study',
  SPORT: 'sport',
  SOCIAL: 'social',
  EXPLORATION: 'exploration',
  CAREER: 'career'
};

export const SKILL_EFFECTS = {
  examBonus: 'examBonus',
  runningBonus: 'runningBonus',
  socialBonus: 'socialBonus',
  explorationBonus: 'explorationBonus',
  staminaCostReduction: 'staminaCostReduction',
  knowledgeGainBonus: 'knowledgeGainBonus',
  moodGainBonus: 'moodGainBonus'
};

function normalizeSkill(skill) {
  if (!skill) return null;
  return {
    id: skill.id || '',
    name: skill.name || '未命名技能',
    description: skill.description || '',
    category: skill.category || SKILL_CATEGORY.STUDY,
    maxLevel: typeof skill.maxLevel === 'number' ? skill.maxLevel : 5,
    unlockConditions: skill.unlockConditions || {},
    levelRequirements: skill.levelRequirements || [],
    effects: skill.effects || {},
    relatedStats: Array.isArray(skill.relatedStats) ? skill.relatedStats : [],
    relatedItems: Array.isArray(skill.relatedItems) ? skill.relatedItems : [],
    tags: Array.isArray(skill.tags) ? skill.tags : []
  };
}

export const SKILL_CONFIG = {
  math_focus: normalizeSkill({
    id: 'math_focus',
    name: '数学专注',
    description: '在数学相关学习和考试中更易进入心流状态，提升考试成功率与知识获取。',
    category: SKILL_CATEGORY.STUDY,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'math_intro' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      examBonus: 0.02,
      knowledgeGainBonus: 0.04
    },
    relatedStats: ['knowledge'],
    relatedItems: ['study_notes', 'coffee'],
    tags: ['study', 'math', 'exam']
  }),
  library_research: normalizeSkill({
    id: 'library_research',
    name: '文献检索',
    description: '在图书馆自习和科研任务中效率更高，知识收益提升。',
    category: SKILL_CATEGORY.STUDY,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'self_study_library_1' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      knowledgeGainBonus: 0.05,
      examBonus: 0.01
    },
    relatedStats: ['knowledge'],
    relatedItems: ['study_notes', 'notebook'],
    tags: ['study', 'library', 'research']
  }),
  endurance_training: normalizeSkill({
    id: 'endurance_training',
    name: '耐力训练',
    description: '长期跑步训练提升体能，降低跑步体力消耗并提高体测表现。',
    category: SKILL_CATEGORY.SPORT,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'run_first' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      runningBonus: 0.03,
      staminaCostReduction: 0.02
    },
    relatedStats: ['stamina', 'maxStamina'],
    relatedItems: ['sports_drink'],
    tags: ['sport', 'running', 'stamina']
  }),
  sprint_burst: normalizeSkill({
    id: 'sprint_burst',
    name: '冲刺爆发',
    description: '短跑爆发能力，在体测和需要体能的活动中提供额外成功率。',
    category: SKILL_CATEGORY.SPORT,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'run_fitness_test' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      runningBonus: 0.04
    },
    relatedStats: ['stamina'],
    relatedItems: ['sports_drink'],
    tags: ['sport', 'sprint', 'fitness']
  }),
  club_coordination: normalizeSkill({
    id: 'club_coordination',
    name: '社团协调',
    description: '在社团活动与项目协作中更受欢迎，提升社交收益。',
    category: SKILL_CATEGORY.SOCIAL,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'club_join' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      socialBonus: 0.05
    },
    relatedStats: ['social'],
    relatedItems: ['club_badge'],
    tags: ['social', 'club', 'teamwork']
  }),
  presentation: normalizeSkill({
    id: 'presentation',
    name: '表达能力',
    description: '提升答辩、演讲与社团展示时的社交与知识反馈。',
    category: SKILL_CATEGORY.SOCIAL,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'club_project' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      socialBonus: 0.04,
      moodGainBonus: 0.02
    },
    relatedStats: ['social', 'mood'],
    relatedItems: ['club_badge'],
    tags: ['social', 'presentation', 'mood']
  }),
  campus_observation: normalizeSkill({
    id: 'campus_observation',
    name: '校园观察',
    description: '对校园地点和隐藏细节更敏感，探索收益提升。',
    category: SKILL_CATEGORY.EXPLORATION,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'explore_first' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      explorationBonus: 0.05
    },
    relatedStats: ['knowledge', 'mood'],
    relatedItems: ['lab_pass'],
    tags: ['exploration', 'campus', 'discovery']
  }),
  lab_practice: normalizeSkill({
    id: 'lab_practice',
    name: '实验实践',
    description: '在实验室任务中积累动手经验，提升知识获取与探索收益。',
    category: SKILL_CATEGORY.CAREER,
    maxLevel: 5,
    unlockConditions: { completedQuest: 'explore_lab' },
    levelRequirements: [0, 100, 300, 600, 1000],
    effects: {
      knowledgeGainBonus: 0.03,
      explorationBonus: 0.02
    },
    relatedStats: ['knowledge'],
    relatedItems: ['lab_record', 'lab_pass'],
    tags: ['career', 'lab', 'practice']
  })
};

export const SKILL_LIST = Object.values(SKILL_CONFIG);

export function getSkillById(skillId) {
  return SKILL_CONFIG[skillId] || null;
}

export function getSkillsByCategory(category) {
  return SKILL_LIST.filter(s => s.category === category);
}

export function getSkillByEffect(effectKey) {
  return SKILL_LIST.filter(s => s.effects[effectKey] !== undefined);
}

export function getSkillLevelFromExp(exp, levelRequirements = [0, 100, 300, 600, 1000]) {
  if (typeof exp !== 'number' || Number.isNaN(exp) || exp < 0) return 1;
  const thresholds = Array.isArray(levelRequirements) && levelRequirements.length > 0 ? levelRequirements : [0, 100, 300, 600, 1000];
  let level = 1;
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (exp >= thresholds[i]) {
      level = i + 1;
      break;
    }
  }
  return level;
}

export function getExpRequiredForSkillLevel(level, levelRequirements) {
  const thresholds = Array.isArray(levelRequirements) && levelRequirements.length > 0 ? levelRequirements : [0, 100, 300, 600, 1000];
  if (level <= 1) return 0;
  if (level > thresholds.length + 1) return thresholds[thresholds.length - 1] || 0;
  return thresholds[level - 1] || 0;
}

export function getSkillEffectValue(skillId, effectKey, skillLevel = 1, config = SKILL_CONFIG) {
  const skill = config[skillId];
  if (!skill || !skill.effects[effectKey]) return 0;
  const base = skill.effects[effectKey];
  return base * skillLevel;
}

export function getSkillUnlockStatus(skillId, context = {}) {
  const skill = getSkillById(skillId);
  if (!skill) return { unlocked: false, reason: '技能不存在' };
  const conditions = skill.unlockConditions || {};
  if (Object.keys(conditions).length === 0) return { unlocked: true, reason: '' };

  const { characterStats = {}, completedQuests = new Set(), unlockedSkills = new Set(), unlockedSubjects = new Set(), proficiencies = {} } = context;

  if (conditions.level && (characterStats.level || 0) < conditions.level) {
    return { unlocked: false, reason: `需要角色等级 ${conditions.level}` };
  }
  if (conditions.statMin) {
    for (const [stat, min] of Object.entries(conditions.statMin)) {
      if ((characterStats[stat] || 0) < min) {
        return { unlocked: false, reason: `需要 ${stat} >= ${min}` };
      }
    }
  }
  if (conditions.subject && (conditions.subjectLevel || 0) > 0) {
    const prof = proficiencies[conditions.subject];
    if (!prof || (prof.level || 1) < conditions.subjectLevel) {
      return { unlocked: false, reason: `需要 ${conditions.subject} 熟练度 >= ${conditions.subjectLevel}` };
    }
  }
  if (conditions.prerequisiteSkill && !unlockedSkills.has(conditions.prerequisiteSkill)) {
    return { unlocked: false, reason: `需要前置技能 ${conditions.prerequisiteSkill}` };
  }
  if (conditions.completedQuest && !completedQuests.has(conditions.completedQuest)) {
    return { unlocked: false, reason: `需要完成任务 ${conditions.completedQuest}` };
  }
  if (conditions.unlockedSubject && !unlockedSubjects.has(conditions.unlockedSubject)) {
    return { unlocked: false, reason: `需要解锁科目 ${conditions.unlockedSubject}` };
  }

  return { unlocked: true, reason: '' };
}

export default {
  SKILL_CATEGORY,
  SKILL_EFFECTS,
  SKILL_CONFIG,
  SKILL_LIST,
  getSkillById,
  getSkillsByCategory,
  getSkillByEffect,
  getSkillLevelFromExp,
  getExpRequiredForSkillLevel,
  getSkillEffectValue,
  getSkillUnlockStatus
};
