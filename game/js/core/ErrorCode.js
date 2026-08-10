/**
 * HUST WORLD 统一错误码定义。
 * 所有错误码均为常量对象，包含 `code`（机器可读标识）与 `message`（默认用户提示）。
 * 本文件不依赖任何 Node 专用 API，可在浏览器与测试环境中直接 import。
 */

export const ErrorCode = Object.freeze({
  // 巴士系统
  BUS_NO_CARD: { code: 'BUS_NO_CARD', message: '需要校园卡才能乘坐校车，请先完成报到。' },
  BUS_NO_MONEY: { code: 'BUS_NO_MONEY', message: '余额不足，无法乘坐校车。' },

  // 任务系统
  QUEST_NOT_FOUND: { code: 'QUEST_NOT_FOUND', message: '任务不存在。' },
  QUEST_ALREADY_COMPLETED: { code: 'QUEST_ALREADY_COMPLETED', message: '任务已完成。' },
  QUEST_ALREADY_ACTIVE: { code: 'QUEST_ALREADY_ACTIVE', message: '任务已在进行中。' },
  QUEST_NOT_ACTIVE: { code: 'QUEST_NOT_ACTIVE', message: '任务未在激活状态。' },
  QUEST_NOT_AVAILABLE: { code: 'QUEST_NOT_AVAILABLE', message: '任务未解锁。' },
  QUEST_PREREQ_NOT_MET: { code: 'QUEST_PREREQ_NOT_MET', message: '前置任务未完成。' },
  QUEST_TIME_LOCKED: { code: 'QUEST_TIME_LOCKED', message: '当前时间或学期阶段不满足任务要求。' },
  QUEST_LOCATION_NOT_CONFIGURED: { code: 'QUEST_LOCATION_NOT_CONFIGURED', message: '任务地点未配置。' },
  QUEST_NOT_AT_LOCATION: { code: 'QUEST_NOT_AT_LOCATION', message: '未到达任务地点。' },

  // 物品 / NPC / POI / 成就
  ITEM_UNAVAILABLE: { code: 'ITEM_UNAVAILABLE', message: '物品不可用或数量不足。' },
  ITEM_NOT_USABLE: { code: 'ITEM_NOT_USABLE', message: '该物品无法使用。' },
  NPC_NOT_FOUND: { code: 'NPC_NOT_FOUND', message: 'NPC 不存在。' },
  POI_NOT_FOUND: { code: 'POI_NOT_FOUND', message: '地点不存在。' },
  ACHIEVEMENT_ALREADY_UNLOCKED: { code: 'ACHIEVEMENT_ALREADY_UNLOCKED', message: '成就已解锁。' },

  // 技能（扩展）
  SKILL_NOT_FOUND: { code: 'SKILL_NOT_FOUND', message: '技能不存在。' },
  SKILL_LOCKED: { code: 'SKILL_LOCKED', message: '未满足解锁条件。' },
  SKILL_ALREADY_UNLOCKED: { code: 'SKILL_ALREADY_UNLOCKED', message: '技能已解锁。' },

  // 通用
  UNKNOWN: { code: 'UNKNOWN', message: '发生未知错误，请稍后再试。' }
});
