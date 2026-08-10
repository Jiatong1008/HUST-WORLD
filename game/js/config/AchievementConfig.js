export const ACHIEVEMENTS = {
  first_step: {
    id: 'first_step',
    title: '森林大学第一步',
    description: '完成新生报到，正式踏入华中科技大学的校园。',
    icon: '🌲',
    hidden: false,
    reward: { xp: 10, title: 'HUST新生' }
  },
  willpower_seed: {
    id: 'willpower_seed',
    title: '军训硬核',
    description: '完成军训历练，在华科的阳光下坚持到了最后。',
    icon: '🎖️',
    hidden: false,
    reward: { xp: 15, title: '钢铁意志' }
  },
  study_in_hust: {
    id: 'study_in_hust',
    title: '学在华科',
    description: '完成高数第一课，开启“四大名补”征途。',
    icon: '📚',
    hidden: false,
    reward: { xp: 20, title: '学霸预备' }
  },
  exam_survivor: {
    id: 'exam_survivor',
    title: '期末幸存者',
    description: '在图书馆和咖啡的陪伴下完成期末考试。',
    icon: '☕',
    hidden: false,
    reward: { xp: 25, title: '考试周勇士' }
  },
  campus_explorer: {
    id: 'campus_explorer',
    title: '校园 explorer',
    description: '探索南大门、青年园、图书馆、毛主席像等校园地标。',
    icon: '🧭',
    hidden: false,
    reward: { xp: 15, title: '森林向导' }
  },
  canteen_hunter: {
    id: 'canteen_hunter',
    title: '食堂猎人',
    description: '解锁华科食堂隐藏菜单，热干面yyds。',
    icon: '🍜',
    hidden: false,
    reward: { xp: 10, title: '老饕' }
  },
  club_star: {
    id: 'club_star',
    title: '百团之星',
    description: '加入社团并参加活动，体验华科丰富多彩的社团文化。',
    icon: '⭐',
    hidden: false,
    reward: { xp: 20, title: '社团达人' }
  },
  runner_hust: {
    id: 'runner_hust',
    title: '森林夜跑侠',
    description: '完成东操场夜跑，感受华科运动氛围。',
    icon: '🏃',
    hidden: false,
    reward: { xp: 15, title: '夜跑达人' }
  },
  fitness_pass: {
    id: 'fitness_pass',
    title: '体测通关',
    description: '完成体测挑战，1000米/800米不再噩梦。',
    icon: '💪',
    hidden: false,
    reward: { xp: 20, title: '体测王者' }
  },
  library_hero: {
    id: 'library_hero',
    title: '图书馆占座先锋',
    description: '在主图书馆找到自习角落，体验“学在华科”的精神图腾。',
    icon: '📖',
    hidden: false,
    reward: { xp: 15, title: '图书馆战神' }
  },
  lab_rookie: {
    id: 'lab_rookie',
    title: '实验室新星',
    description: '参观光电国家研究中心，迈出科研第一步。',
    icon: '🔬',
    hidden: false,
    reward: { xp: 25, title: '科研萌新' }
  },
  intern_ready: {
    id: 'intern_ready',
    title: '实习预备役',
    description: '在东校区CBD准备简历，为实习季蓄力。',
    icon: '💼',
    hidden: false,
    reward: { xp: 20, title: '职场新秀' }
  },
  thesis_knight: {
    id: 'thesis_knight',
    title: '毕设骑士',
    description: '与导师讨论选题，开启毕业论文征程。',
    icon: '🛡️',
    hidden: false,
    reward: { xp: 30, title: '论文战士' }
  },
  defense_master: {
    id: 'defense_master',
    title: '答辩大师',
    description: '用三分钟讲清四年工作，通过毕业答辩。',
    icon: '🎓',
    hidden: false,
    reward: { xp: 40, title: '答辩战神' }
  },
  hust_graduate: {
    id: 'hust_graduate',
    title: '森林大学毕业生',
    description: '完成毕业典礼，从华中大走向世界。',
    icon: '🏆',
    hidden: false,
    reward: { xp: 100, title: 'HUST校友' }
  },
  bus_regular: {
    id: 'bus_regular',
    title: '校车常客',
    description: '累计乘坐校园巴士10次，成为穿梭森林大学的老司机。',
    icon: '🚌',
    hidden: false,
    reward: { xp: 15, title: '校车达人' }
  },
  first_purchase: {
    id: 'first_purchase',
    title: '第一笔校园消费',
    description: '在校园超市或食堂完成第一次购物，开启校园生活。',
    icon: '🛒',
    hidden: false,
    reward: { xp: 5, title: '消费者' }
  },
  first_bus_ride: {
    id: 'first_bus_ride',
    title: '校车初体验',
    description: '第一次乘坐校园巴士，从森林大学的一端驶向另一端。',
    icon: '🚍',
    hidden: false,
    reward: { xp: 5, title: '乘车人' }
  },
  first_poi_visit: {
    id: 'first_poi_visit',
    title: '打卡森林大学',
    description: '第一次到达校园地标，开始探索华中大。',
    icon: '📍',
    hidden: false,
    reward: { xp: 5, title: '打卡者' }
  },
  photo_pioneer: {
    id: 'photo_pioneer',
    title: '校园摄影师',
    description: '在 5 个不同校园地点完成拍照打卡，留住华科记忆。',
    icon: '📸',
    hidden: false,
    reward: { xp: 10, title: '摄影师' }
  }
};

export const ACHIEVEMENT_LIST = Object.values(ACHIEVEMENTS);

export function getAchievementById(id) {
  return ACHIEVEMENTS[id] || null;
}

export function getAchievementsByTitle(title) {
  return ACHIEVEMENT_LIST.filter(a => a.reward.title === title);
}

export default ACHIEVEMENTS;
