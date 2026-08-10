/**
 * ============================================================
 * QuestPoiBinder — 统一任务到 POI 绑定系统
 * ============================================================
 *
 * 职责：
 *   1. 从 QuestTriggerConfig 读取主线/支线任务地点
 *   2. 从 map_locations.json 读取地图 POI
 *   3. 统一输出任务 → POI 绑定关系
 *   4. 提供匹配、查询、导出报告能力
 *
 * 【性能优化 5.1b】：绑定计算从启动立即执行改为空闲时延迟，
 * 避免阻塞首屏与地图初始化。main.js 通过 requestIdleCallback / setTimeout 调度。
 */

import {
  MAIN_QUEST_CONFIG,
  SIDE_QUEST_CONFIG,
  SIDE_QUEST_LOCATIONS,
  SPECIAL_LOCATIONS,
  getAllQuests,
  resolveQuestLocation
} from '../../../game/js/config/QuestTriggerConfig.js';

class QuestPoiBinder {
  constructor() {
    this.mapLocations = [];
    this.bindings = [];
    this.warnings = [];
    this.initialized = false;
    if (typeof window !== 'undefined') {
      window.questPoiBinder = this;
    }
  }

  /**
   * 初始化 POI 绑定：加载地图数据并执行绑定计算。
   * 测试入口可直接调用；正式环境由 main.js 延迟调度 bindQuestsToMap。
   * @returns {Promise<void>}
   */
  async init() {
    if (this.initialized) return;
    await this.bindQuestsToMap();
    this.initialized = true;
  }

  async _loadMapLocations() {
    try {
      const res = await fetch('/map/mapdata/map_locations.json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const layer = data.layers?.find(l => l.name === 'locations');
      this.mapLocations = (layer?.objects || [])
        .filter(obj => obj.visible !== false)
        .map(obj => {
          const props = this._propsToObject(obj.properties);
          const isPoint = !obj.width && !obj.height;
          return {
            map_id: Number(props.map_id ?? obj.id),
            name: obj.name,
            type: obj.type || 'landmark',
            x: isPoint ? obj.x : obj.x + obj.width / 2,
            y: isPoint ? obj.y : obj.y + obj.height / 2,
            rawX: obj.x,
            rawY: obj.y,
            width: obj.width || 0,
            height: obj.height || 0,
            description: props.description || ''
          };
        });
    } catch (e) {
      console.warn('[QuestPoiBinder] 地图 POI 加载失败:', e.message);
      this.mapLocations = [];
    }
  }

  _propsToObject(properties = []) {
    return Object.fromEntries(properties.map(p => [p.name, p.value]));
  }

  /**
   * 加载地图 POI 并构建任务绑定关系。
   * 性能优化 5.1b：由 main.js 在 requestIdleCallback / setTimeout 中延迟调用。
   * @returns {Promise<void>}
   */
  async bindQuestsToMap() {
    if (!this.mapLocations.length) {
      await this._loadMapLocations();
    }
    this._buildBindings();
    this.initialized = true;
  }

  _buildBindings() {
    this.bindings = [];
    this.warnings = [];

    const allMainQuests = getAllQuests();
    for (const quest of allMainQuests) {
      this._bindQuest(quest, 'main', this._inferMainGroup(quest));
    }

    for (const quest of Object.values(SIDE_QUEST_CONFIG)) {
      this._bindQuest(quest, 'side', this._inferSideGroup(quest));
    }
  }

  _inferMainGroup(quest) {
    if (quest.type === 'exam') return 'exam';
    if (quest.type === 'dialogue') return 'course';
    if (quest.type === 'training') return 'training';
    if (quest.type === 'rest') return 'rest';
    return 'main';
  }

  _inferSideGroup(quest) {
    if (quest.type === 'club') return 'club';
    if (quest.type === 'running') return 'running';
    if (quest.type === 'exploration') return 'exploration';
    return 'side';
  }

  _bindQuest(quest, questType, group) {
    const result = {
      questId: quest.id,
      questType,
      group,
      questName: quest.name || quest.title,
      locationType: quest.locationType || quest.locationName || null,
      locationName: quest.locationName || quest.locationType || null,
      poiId: null,
      poiName: null,
      x: null,
      y: null,
      source: null,
      status: 'unbound',
      warning: null
    };

    const location = resolveQuestLocation(quest, '计算机科学与技术学院');
    if (location?.x != null && location?.y != null) {
      result.x = location.x;
      result.y = location.y;
      result.source = 'SPECIAL_LOCATIONS';
      result.poiName = location.name || quest.locationName || quest.locationType;
      result.status = 'special';
    }

    const poi = this._findBestPoi(quest, location);
    if (poi) {
      result.poiId = poi.map_id;
      result.poiName = poi.name || result.poiName;
      result.x = poi.x ?? result.x;
      result.y = poi.y ?? result.y;
      result.source = 'map_locations';
      result.status = 'bound';
    } else if (!result.x) {
      result.status = 'unbound';
      result.warning = '地点待配置';
      this.warnings.push({ questId: quest.id, reason: '未找到匹配 POI' });
    }

    this.bindings.push(result);
  }

  _findBestPoi(quest, resolvedLocation) {
    const searchName = quest.locationName || quest.locationType || '';

    const exactName = this.mapLocations.find(p => p.name === searchName);
    if (exactName) return exactName;

    if (quest.locationType) {
      const typeMap = {
        '寝室': ['dormitory'],
        '教学楼': ['teaching'],
        '图书馆': ['library'],
        '操场': ['playground'],
        '南大门': ['gate'],
        '地标': ['landmark', 'square'],
        '广场': ['square']
      };
      const types = typeMap[quest.locationType] || [];
      const typeMatch = this.mapLocations.find(p => types.includes(p.type));
      if (typeMatch) return typeMatch;
    }

    const aliases = {
      '大学生活动中心': ['大活', '集贸市场'],
      '主图书馆': ['图书馆'],
      '东操场': ['操场', '东操'],
      '中操场': ['操场', '中心操场'],
      '西操场': ['操场', '西操'],
      '韵苑宿舍': ['宿舍', '寝室'],
      '沁苑宿舍': ['宿舍', '寝室'],
      '紫菘宿舍': ['宿舍', '寝室']
    };
    const candidateNames = aliases[searchName] || [];
    for (const name of candidateNames) {
      const match = this.mapLocations.find(p => p.name.includes(name) || name.includes(p.name));
      if (match) return match;
    }

    if (resolvedLocation?.x != null) {
      return this._findNearestPoi(resolvedLocation.x, resolvedLocation.y);
    }

    return null;
  }

  _findNearestPoi(x, y) {
    if (!this.mapLocations.length) return null;
    let best = null;
    let bestDist = Infinity;
    for (const p of this.mapLocations) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bestDist) {
        bestDist = d;
        best = p;
      }
    }
    return best;
  }

  getBindings() {
    return this.bindings;
  }

  getBindingByQuestId(questId) {
    return this.bindings.find(b => b.questId === questId) || null;
  }

  getBindingsByPoiId(poiId) {
    return this.bindings.filter(b => b.poiId === poiId);
  }

  getBindingsByGroup(group) {
    return this.bindings.filter(b => b.group === group);
  }

  getBindingsByQuestType(type) {
    return this.bindings.filter(b => b.questType === type);
  }

  getUnboundBindings() {
    return this.bindings.filter(b => b.status === 'unbound');
  }

  getPoiById(poiId) {
    return this.mapLocations.find(p => p.map_id === poiId) || null;
  }

  getAllPois() {
    return this.mapLocations;
  }

  exportReport() {
    return {
      totalQuests: this.bindings.length,
      bound: this.bindings.filter(b => b.status === 'bound').length,
      special: this.bindings.filter(b => b.status === 'special').length,
      unbound: this.bindings.filter(b => b.status === 'unbound').length,
      warnings: this.warnings,
      bindings: this.bindings
    };
  }
}

export const questPoiBinder = new QuestPoiBinder();
export default questPoiBinder;
