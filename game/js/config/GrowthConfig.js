export const STAT_RANGES = {
  level: { min: 1, max: 99 },
  experience: { min: 0, max: Infinity },
  money: { min: 0, max: 9999999 },
  stamina: { min: 0, max: 100 },
  knowledge: { min: 0, max: 100 },
  social: { min: 0, max: 100 },
  mood: { min: 0, max: 100 }
};

export const GRADE_SEMESTER_WEEK_BOUNDS = {
  grade: { min: 1, max: 4 },
  semester: { min: 1, max: 2 },
  week: { min: 1, max: 20 }
};

export const LEVEL_CONFIG = {
  baseExp: 100,
  expMultiplier: 1.5,
  maxStaminaBonusPerLevel: 10,
  statBonusOnLevelUp: {
    knowledge: 1,
    social: 1,
    mood: 1
  }
};

export function getExpRequired(level) {
  if (level <= 1) return 0;
  const { baseExp, expMultiplier } = LEVEL_CONFIG;
  return Math.floor(baseExp * Math.pow(expMultiplier, level - 2));
}

export function getTotalExpForLevel(targetLevel) {
  if (targetLevel <= 1) return 0;
  let total = 0;
  for (let level = 2; level <= targetLevel; level++) {
    total += getExpRequired(level);
  }
  return total;
}

export function getLevelFromExp(experience) {
  if (experience <= 0) return 1;
  let level = 1;
  let accumulated = 0;
  while (true) {
    const nextLevelExp = getExpRequired(level + 1);
    if (nextLevelExp <= 0) break;
    if (experience >= accumulated + nextLevelExp) {
      accumulated += nextLevelExp;
      level += 1;
    } else {
      break;
    }
  }
  return level;
}

export function getLevelUpRewards(level, config = LEVEL_CONFIG) {
  const maxStaminaBonus = config.maxStaminaBonusPerLevel * (level - 1);
  return {
    maxStaminaBonus,
    statBonus: { ...config.statBonusOnLevelUp }
  };
}

export function clampStat(value, min = 0, max = Infinity) {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

export function clampCharacterStats(stats) {
  const clamped = { ...stats };
  clamped.level = clampStat(clamped.level, STAT_RANGES.level.min, STAT_RANGES.level.max);
  clamped.experience = clampStat(clamped.experience, STAT_RANGES.experience.min, STAT_RANGES.experience.max);
  clamped.money = clampStat(clamped.money, STAT_RANGES.money.min, STAT_RANGES.money.max);
  clamped.knowledge = clampStat(clamped.knowledge, STAT_RANGES.knowledge.min, STAT_RANGES.knowledge.max);
  clamped.social = clampStat(clamped.social, STAT_RANGES.social.min, STAT_RANGES.social.max);
  clamped.mood = clampStat(clamped.mood, STAT_RANGES.mood.min, STAT_RANGES.mood.max);
  clamped.maxStamina = clampStat(clamped.maxStamina || 100, STAT_RANGES.stamina.min + 1, STAT_RANGES.stamina.max + 20);
  if (clamped.stamina === undefined && clamped.physical !== undefined) {
    clamped.stamina = Number(clamped.physical);
  }
  clamped.stamina = clampStat(clamped.stamina, STAT_RANGES.stamina.min, clamped.maxStamina);
  return clamped;
}

export const GROWTH_STAT_LABELS = {
  level: '等级',
  experience: '经验',
  money: '金钱',
  stamina: '体力',
  knowledge: '知识',
  social: '社交',
  mood: '心情'
};

export default {
  STAT_RANGES,
  GRADE_SEMESTER_WEEK_BOUNDS,
  LEVEL_CONFIG,
  getExpRequired,
  getTotalExpForLevel,
  getLevelFromExp,
  getLevelUpRewards,
  clampStat,
  clampCharacterStats,
  GROWTH_STAT_LABELS
};
