export const ITEM_TYPE = {
  CONSUMABLE: 'consumable',
  EQUIPMENT: 'equipment',
  COLLECTIBLE: 'collectible',
  TICKET: 'ticket',
  QUEST: 'quest',
  MATERIAL: 'material',
  GIFT: 'gift'
};

export const ITEM_RARITY = {
  COMMON: 'common',
  UNCOMMON: 'uncommon',
  RARE: 'rare',
  EPIC: 'epic',
  LEGENDARY: 'legendary'
};

export const ITEM_SOURCE = {
  SHOP: 'shop',
  QUEST: 'quest',
  DIALOGUE: 'dialogue',
  EXPLORATION: 'exploration',
  CRAFT: 'craft'
};

function normalizeItem(item) {
  if (!item) return null;
  return {
    itemId: item.itemId || item.id || '',
    name: item.name || 'Unknown Item',
    description: item.description || '',
    category: item.category || item.type || ITEM_TYPE.CONSUMABLE,
    type: item.category || item.type || ITEM_TYPE.CONSUMABLE,
    price: typeof item.price === 'number' ? item.price : 0,
    stackable: item.stackable !== false,
    maxStack: typeof item.maxStack === 'number' ? item.maxStack : 99,
    usable: item.usable !== false && item.type !== ITEM_TYPE.QUEST && item.category !== ITEM_TYPE.QUEST && item.type !== ITEM_TYPE.EQUIPMENT && item.category !== ITEM_TYPE.EQUIPMENT,
    effects: item.effects || {},
    tags: Array.isArray(item.tags) ? item.tags : [],
    source: item.source || ITEM_SOURCE.SHOP,
    rarity: item.rarity || ITEM_RARITY.COMMON,
    icon: item.icon || 'ITEM'
  };
}

export const ITEM_CONFIG = {
  meal_card: normalizeItem({
    itemId: 'meal_card',
    name: '饭卡套餐',
    description: '食堂套餐，恢复体力和心情。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 12,
    effects: { stamina: 25, mood: 5 },
    tags: ['food', 'canteen'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'MEAL'
  }),
  coffee: normalizeItem({
    itemId: 'coffee',
    name: '咖啡',
    description: '考试周续命神器，图书馆里人手一杯。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 10,
    effects: { stamina: 10, knowledge: 5 },
    tags: ['drink', 'study'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'COFFEE'
  }),
  notebook: normalizeItem({
    itemId: 'notebook',
    name: '笔记本',
    description: '厚实的笔记本，好记性不如烂笔头。',
    category: ITEM_TYPE.EQUIPMENT,
    price: 25,
    usable: false,
    effects: { knowledge: 10 },
    tags: ['study', 'equipment'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.UNCOMMON,
    icon: 'NOTE'
  }),
  sports_drink: normalizeItem({
    itemId: 'sports_drink',
    name: '运动饮料',
    description: '体测和夜跑后快速恢复体能。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 6,
    effects: { stamina: 15, mood: 2 },
    tags: ['drink', 'sports'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'DRINK'
  }),
  club_badge: normalizeItem({
    itemId: 'club_badge',
    name: '社团纪念章',
    description: '社团活动的珍贵纪念，提升社交自信。',
    category: ITEM_TYPE.COLLECTIBLE,
    price: 30,
    effects: { social: 10, mood: 5 },
    tags: ['club', 'collectible'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.UNCOMMON,
    icon: 'BADGE'
  }),
  lab_pass: normalizeItem({
    itemId: 'lab_pass',
    name: '实验室通行证',
    description: '进入实验室的临时凭证，科研之路从这里开始。',
    category: ITEM_TYPE.TICKET,
    price: 50,
    effects: { knowledge: 15 },
    tags: ['lab', 'ticket'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.RARE,
    icon: 'LAB'
  }),
  study_notes: normalizeItem({
    itemId: 'study_notes',
    name: '学霸笔记',
    description: '图书馆整理的学习资料，知识点满满。',
    category: ITEM_TYPE.QUEST,
    price: 0,
    usable: false,
    stackable: true,
    maxStack: 9,
    effects: { knowledge: 15 },
    tags: ['quest', 'study'],
    source: ITEM_SOURCE.QUEST,
    rarity: ITEM_RARITY.UNCOMMON,
    icon: 'NOTES'
  }),
  lab_record: normalizeItem({
    itemId: 'lab_record',
    name: '实验记录',
    description: '实验室实验的详细记录，数据严谨。',
    category: ITEM_TYPE.QUEST,
    price: 0,
    usable: false,
    stackable: true,
    maxStack: 9,
    effects: { knowledge: 20 },
    tags: ['quest', 'lab'],
    source: ITEM_SOURCE.QUEST,
    rarity: ITEM_RARITY.RARE,
    icon: 'RECORD'
  }),
  thesis_draft: normalizeItem({
    itemId: 'thesis_draft',
    name: '论文草稿',
    description: '毕业论文初稿，凝聚了四年心血。',
    category: ITEM_TYPE.QUEST,
    price: 0,
    usable: false,
    stackable: true,
    maxStack: 1,
    effects: { knowledge: 50 },
    tags: ['quest', 'thesis'],
    source: ITEM_SOURCE.QUEST,
    rarity: ITEM_RARITY.EPIC,
    icon: 'THESIS'
  }),
  hot_dry_noodles: normalizeItem({
    itemId: 'hot_dry_noodles',
    name: '热干面',
    description: '武汉早餐的灵魂，芝麻酱香浓，吃完干劲十足。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 5,
    effects: { stamina: 20, mood: 8 },
    tags: ['food', 'canteen', 'wuhan'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'NOODLES'
  }),
  doupi: normalizeItem({
    itemId: 'doupi',
    name: '豆皮',
    description: '糯米、肉丁、香菇和蛋皮煎成，武汉特色早餐。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 6,
    effects: { stamina: 22, mood: 6 },
    tags: ['food', 'canteen', 'wuhan'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'PANCAKE'
  }),
  duck_blood_soup: normalizeItem({
    itemId: 'duck_blood_soup',
    name: '鸭血粉丝汤',
    description: '汤鲜味美，冬日食堂里的一碗安慰。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 9,
    effects: { stamina: 18, mood: 10 },
    tags: ['food', 'canteen'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'SOUP'
  }),
  spicy_hot_pot: normalizeItem({
    itemId: 'spicy_hot_pot',
    name: '麻辣香锅',
    description: '食堂顶流，自选配料重口味，吃完心情大好。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 18,
    effects: { stamina: 35, mood: 15 },
    tags: ['food', 'canteen'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.UNCOMMON,
    icon: 'SPICY'
  }),
  nuomiji: normalizeItem({
    itemId: 'nuomiji',
    name: '糯米鸡',
    description: '荷叶包裹的糯米鸡，早餐摊常见选择。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 4,
    effects: { stamina: 15, mood: 5 },
    tags: ['food', 'canteen'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'CHICKEN'
  }),
  egg_wine: normalizeItem({
    itemId: 'egg_wine',
    name: '蛋酒',
    description: '武汉特色早餐饮品，暖胃提神。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 3,
    effects: { stamina: 8, mood: 5, knowledge: 2 },
    tags: ['drink', 'canteen', 'wuhan'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'WINE'
  }),
  energy_bar: normalizeItem({
    itemId: 'energy_bar',
    name: '能量棒',
    description: '图书馆通宵或运动后的快速补给。',
    category: ITEM_TYPE.CONSUMABLE,
    price: 7,
    effects: { stamina: 25, mood: 3 },
    tags: ['food', 'shop'],
    source: ITEM_SOURCE.SHOP,
    rarity: ITEM_RARITY.COMMON,
    icon: 'BAR'
  }),
  library_seat_book: normalizeItem({
    itemId: 'library_seat_book',
    name: '占座书',
    description: '图书馆占座的常见道具，本身并不值钱，但承载了期末精神。使用后可在图书馆占到一个座位。',
    category: ITEM_TYPE.COLLECTIBLE,
    price: 0,
    usable: true,
    effects: { knowledge: 1, mood: 1 },
    tags: ['collectible', 'library', 'quest'],
    source: ITEM_SOURCE.QUEST,
    rarity: ITEM_RARITY.UNCOMMON,
    icon: 'BOOK'
  }),
  hust_card: normalizeItem({
    itemId: 'hust_card',
    name: '校园卡',
    description: '华科学生的身份象征，吃饭、借书、坐校车都离不开它。',
    category: ITEM_TYPE.TICKET,
    price: 20,
    usable: false,
    effects: { social: 5 },
    tags: ['ticket', 'campus'],
    source: ITEM_SOURCE.QUEST,
    rarity: ITEM_RARITY.RARE,
    icon: 'CARD'
  })
};

export const SHOP_CONFIG = {
  campus_shop: {
    shopId: 'campus_shop',
    name: '校园超市',
    description: '日常补给、学习用品与能量零食。',
    items: ['coffee', 'notebook', 'sports_drink', 'club_badge', 'energy_bar', 'hust_card']
  },
  canteen: {
    shopId: 'canteen',
    name: '华科食堂',
    description: '热干面、豆皮、麻辣香锅……吃完干劲十足。',
    items: ['hot_dry_noodles', 'doupi', 'duck_blood_soup', 'spicy_hot_pot', 'nuomiji', 'egg_wine', 'meal_card', 'coffee', 'sports_drink', 'energy_bar']
  },
  lab_shop: {
    shopId: 'lab_shop',
    name: '实验室补给台',
    description: '科研耗材、咖啡和校园卡。',
    items: ['coffee', 'notebook', 'lab_pass', 'energy_bar', 'hust_card']
  }
};

export const ITEM_LIST = Object.values(ITEM_CONFIG);

export function getItemById(itemId) {
  return ITEM_CONFIG[itemId] || null;
}

export function getShopById(shopId) {
  return SHOP_CONFIG[shopId] || null;
}

export function getShopItems(shopId) {
  const shop = SHOP_CONFIG[shopId];
  if (!shop) return [];
  return shop.items.map(getItemById).filter(Boolean);
}

export function getItemByShopAndId(shopId, itemId) {
  const shop = SHOP_CONFIG[shopId];
  if (!shop || !shop.items.includes(itemId)) return null;
  return ITEM_CONFIG[itemId] || null;
}

export function isItemUsable(item) {
  if (!item) return false;
  if (item.usable === false) return false;
  if (item.category === ITEM_TYPE.QUEST || item.type === ITEM_TYPE.QUEST) return false;
  if (item.category === ITEM_TYPE.EQUIPMENT || item.type === ITEM_TYPE.EQUIPMENT) return false;
  return Object.keys(item.effects || {}).length > 0;
}

export function canItemStack(itemA, itemB) {
  if (!itemA || !itemB) return false;
  return itemA.itemId === itemB.itemId && (itemA.stackable !== false) && (itemB.stackable !== false);
}

export default ITEM_CONFIG;
