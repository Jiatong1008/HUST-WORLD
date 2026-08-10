const IMAGE_BASE_PATH = '/map/images/';

const EXISTING_IMAGES = {
  'player-male': '玩家（男）.png',
  'player-female': '玩家（女）.png',
  default_npc_a: '万能角色A.png',
  default_npc_b: '万能角色B.png',
  teacher_a: '老师A.png',
  teacher_b: '老师B.png',
  student_senior_a: '学长A.png',
  student_senior_b: '学姐A.png',
  student_senior_c: '学长B.png',
  guard_a: '保安.png',
  doctor_a: '医生.png',
  coach_a: '体育委员B.png',
  coach_b: '体育委员B.png',
  dancer_leader: '舞蹈社社长.png',
  coding_leader: '蓝桥编程社社长.png',
  parkour_leader: '光影跑酷社社长.png',
  photo_leader: '喻园摄影协会会长.png',
  volunteer_leader: '百景志愿队队长.png',
  shopkeeper_a: '万能角色B.png',
  shopkeeper_b: '万能角色B.png',
  club_leader_a: '万能角色A.png',
  club_leader_b: '万能角色B.png',
  万能角色A: '万能角色A.png',
  万能角色B: '万能角色B.png',
  老师A: '老师A.png',
  老师B: '老师B.png',
  学长A: '学长A.png',
  学长B: '学长B.png',
  学姐A: '学姐A.png',
  学姐B: '学姐B.png',
  保安: '保安.png',
  医生: '医生.png',
  体育委员B: '体育委员B.png',
  舞蹈社社长: '舞蹈社社长.png',
  蓝桥编程社社长: '蓝桥编程社社长.png',
  光影跑酷社社长: '光影跑酷社社长.png',
  喻园摄影协会会长: '喻园摄影协会会长.png',
  百景志愿队队长: '百景志愿队队长.png'
};

const NPC_ALIAS_MAP = {
  teacher: 'teacher_a',
  teacher_a: 'teacher_a',
  teacher_b: 'teacher_b',
  math_teacher: 'teacher_a',
  thesis_supervisor: 'teacher_b',
  defense_teacher: 'teacher_a',
  student_senior_a: 'student_senior_a',
  student_senior_b: 'student_senior_b',
  student_senior_c: 'student_senior_c',
  volunteer_freshman: 'student_senior_a',
  coach_a: 'coach_a',
  coach_b: 'coach_b',
  running_coach: 'coach_b',
  drill_instructor: 'coach_a',
  club_leader_a: 'club_leader_a',
  club_leader: 'club_leader_a',
  shopkeeper_a: 'shopkeeper_a',
  shopkeeper_b: 'shopkeeper_b',
  shopkeeper: 'shopkeeper_b',
  canteen_auntie: 'shopkeeper_a',
  librarian: 'student_senior_b',
  lab_mentor: 'teacher_b',
  internship_senior: 'student_senior_c',
  default: 'default_npc_a'
};

const KEYWORD_ALIAS = [
  ['老师', 'teacher_a'],
  ['教师', 'teacher_a'],
  ['导师', 'teacher_b'],
  ['学长', 'student_senior_a'],
  ['学姐', 'student_senior_b'],
  ['志愿', 'volunteer_leader'],
  ['体育', 'coach_a'],
  ['跑步', 'coach_b'],
  ['教官', 'coach_a'],
  ['社团', 'club_leader_a'],
  ['编程', 'coding_leader'],
  ['跑酷', 'parkour_leader'],
  ['摄影', 'photo_leader'],
  ['舞蹈', 'dancer_leader'],
  ['商店', 'shopkeeper_b'],
  ['食堂', 'shopkeeper_a'],
  ['保安', 'guard_a'],
  ['医生', 'doctor_a']
];

/**
 * 图片缓存池：按 URL 复用已加载的 Image 实例，避免重复请求与解码。
 * 用于性能优化 5.1a，统计加载状态并提供预加载/逐出能力。
 */
class ImageCache {
  constructor() {
    /** @type {Map<string, HTMLImageElement>} 已完成的图片 */
    this.loadedImages = new Map();
    /** @type {Map<string, Promise<HTMLImageElement>>} 进行中的加载请求 */
    this.pendingImages = new Map();
  }

  /**
   * 预加载指定 URL 的图片，返回缓存或新加载的 Image 实例。
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  preloadImage(url) {
    const cached = this.loadedImages.get(url);
    if (cached) return Promise.resolve(cached);

    const pending = this.pendingImages.get(url);
    if (pending) return pending;

    const promise = new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(url, img);
        this.pendingImages.delete(url);
        resolve(img);
      };
      img.onerror = () => {
        this.pendingImages.delete(url);
        reject(new Error(`Failed to load image: ${url}`));
      };
      img.src = url;
    });
    this.pendingImages.set(url, promise);
    return promise;
  }

  /**
   * 获取已缓存的图片实例，未加载则返回 null。
   * @param {string} url
   * @returns {HTMLImageElement | null}
   */
  getImage(url) {
    return this.loadedImages.get(url) || null;
  }

  /**
   * 释放指定 URL 的图片缓存。
   * @param {string} url
   */
  evictImage(url) {
    this.loadedImages.delete(url);
    this.pendingImages.delete(url);
  }

  /** 清空所有图片缓存。 */
  evictAll() {
    this.loadedImages.clear();
    this.pendingImages.clear();
  }

  /**
   * 预加载一组相邻图片（如相邻瓦片或场景）。
   * @param {string} currentUrl
   * @param {string[]} neighbors
   * @returns {Promise<HTMLImageElement[]>}
   */
  preloadAdjacentImages(currentUrl, neighbors = []) {
    if (currentUrl) {
      this.preloadImage(currentUrl).catch(() => {});
    }
    return Promise.all(
      neighbors.map(url => this.preloadImage(url).catch(() => null))
    );
  }
}

class ImageManager {
  constructor() {
    this.images = new Map();
    this.imageBasePath = IMAGE_BASE_PATH;
    this.isLoaded = false;
    /** 跨会话复用的 URL 级图片缓存，支撑 NPC/玩家图片懒加载与相邻预加载。 */
    this.cache = new ImageCache();
  }

  async loadAllImages() {
    const entries = Object.entries(EXISTING_IMAGES);
    await Promise.all(entries.map(([name, src]) => this.loadImage(name, src)));
    this.isLoaded = true;
    console.log('[ImageManager] images loaded');
  }

  /**
   * 加载指定名称的图片；优先返回已缓存的 Image 实例，避免重复创建。
   * 性能优化 5.1a：已加载图片复用，减少请求与内存占用。
   * @param {string} name
   * @param {string} src
   * @returns {Promise<HTMLImageElement>}
   */
  loadImage(name, src) {
    const fullPath = this.imageBasePath + src;
    const cached = this.cache.getImage(fullPath);
    if (cached) {
      this.images.set(name, cached);
      return Promise.resolve(cached);
    }

    return this.cache.preloadImage(fullPath).then((img) => {
      this.images.set(name, img);
      return img;
    }).catch(() => {
      const fallback = this.images.get('default_npc_a') || this.images.get('万能角色A') || null;
      if (fallback) this.images.set(name, fallback);
      console.warn('[ImageManager] image load failed, fallback used:', name, fullPath);
      return fallback;
    });
  }

  getNpcImage(npcName = '', npcType = null) {
    const key = this._resolveImageKey(npcName, npcType);
    return this.images.get(key) || this.images.get('default_npc_a') || this.images.get('万能角色A') || null;
  }

  getPlayerImage(gender = 'male') {
    const key = gender === 'female' ? 'player-female' : 'player-male';
    return this.images.get(key) || this.images.get('player-male') || this.getNpcImage();
  }

  isReady() {
    return this.isLoaded;
  }

  /**
   * 预加载指定 URL 的图片并缓存（ImageManager 代理方法）。
   * @param {string} url
   * @returns {Promise<HTMLImageElement>}
   */
  preloadImage(url) { return this.cache.preloadImage(url); }

  /**
   * 获取已缓存的 URL 图片（ImageManager 代理方法）。
   * @param {string} url
   * @returns {HTMLImageElement | null}
   */
  getImage(url) { return this.cache.getImage(url); }

  /** 释放指定 URL 的图片缓存。 */
  evictImage(url) { this.cache.evictImage(url); }

  /** 清空图片缓存。 */
  evictAll() { this.cache.evictAll(); }

  /**
   * 预加载当前图片及其相邻图片。
   * @param {string} currentUrl
   * @param {string[]} neighbors
   * @returns {Promise<HTMLImageElement[]>}
   */
  preloadAdjacentImages(currentUrl, neighbors) { return this.cache.preloadAdjacentImages(currentUrl, neighbors); }

  getImageUrl(npcName = '', npcType = null) {
    const key = this._resolveImageKey(npcName, npcType);
    return this.imageBasePath + (EXISTING_IMAGES[key] || EXISTING_IMAGES.default_npc_a);
  }

  _resolveImageKey(npcName = '', npcType = null) {
    if (EXISTING_IMAGES[npcName]) return npcName;
    if (NPC_ALIAS_MAP[npcName]) return NPC_ALIAS_MAP[npcName];
    if (npcType && NPC_ALIAS_MAP[npcType]) return NPC_ALIAS_MAP[npcType];

    for (const [keyword, alias] of KEYWORD_ALIAS) {
      if (String(npcName).includes(keyword)) return alias;
    }
    return 'default_npc_a';
  }
}

export const imageManager = new ImageManager();
