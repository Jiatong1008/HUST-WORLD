/**
 * 地图数据管理器 — 加载数据、空间索引、碰撞检测
 *
 * 【优化】：空间网格索引
 *   将 8000×4000 地图划分为 200px 网格，碰撞检测和附近查询
 *   只需检查命中的网格，避免遍历全部数据。
 */

import { MAP } from './config.js';
import { EventBus } from './EventBus.js';

const GRID_SIZE = 200;
const POINT_HIT_RADIUS = 24;

class MapData {
  constructor() {
    this.locations = [];
    this.collisionPolys = [];
    this._collisionEntries = [];
    this.bgImg = null;
    this.loaded = false;

    // 空间索引
    this._locGrid = {};    // key: "gx,gy" → [locationIndex, ...]
    this._colGrid = {};    // key: "gx,gy" → [polyIndex, ...]
    this._gridCols = 0;
    this._gridRows = 0;

    // 视口裁剪候选集缓存：避免每帧重建完整候选集
    this._vpCache = {
      x: null, y: null, w: null, h: null,
      lastTime: 0,
      result: []
    };

    // 点击查询候选集缓存：避免频繁完整计算
    this._clickCache = {
      x: null, y: null,
      radius: null,
      result: [],
      lastTime: 0
    };
  }

  /**
   * 获取视口内的地点列表（性能优化 5.1c：视口裁剪 + 缓存）。
   * 当视口位置/尺寸变化超过阈值，或距离上次计算超过 200ms 时才重建候选集。
   * @param {number} x - 视口左上角世界坐标 x
   * @param {number} y - 视口左上角世界坐标 y
   * @param {number} w - 视口宽度（世界坐标）
   * @param {number} h - 视口高度（世界坐标）
   * @returns {Array<Object>}
   */
  getLocationsInViewport(x, y, w, h) {
    const now = performance.now();
    const cache = this._vpCache;
    const moved = cache.x === null ||
      Math.abs(cache.x - x) > 100 ||
      Math.abs(cache.y - y) > 100 ||
      cache.w !== w ||
      cache.h !== h ||
      (now - cache.lastTime) > 200;

    if (!moved && cache.result.length > 0) {
      return cache.result;
    }

    const result = [];
    const padding = 64;
    const rect = {
      x: x - padding,
      y: y - padding,
      width: w + padding * 2,
      height: h + padding * 2
    };

    const seen = new Set();
    for (const key of this._cellsForBounds(rect)) {
      const arr = this._locGrid[key];
      if (!arr) continue;
      for (const i of arr) {
        if (seen.has(i)) continue;
        seen.add(i);
        const loc = this.locations[i];
        const b = loc.bounds;
        if (b.x > x + w || b.x + b.width < x || b.y > y + h || b.y + b.height < y) continue;
        result.push(loc);
      }
    }

    cache.x = x;
    cache.y = y;
    cache.w = w;
    cache.h = h;
    cache.lastTime = now;
    cache.result = result;
    return result;
  }

  async init() {
    try {
      const [locData, colData] = await Promise.all([
        this._fetchJSON(MAP.locJson),
        this._fetchJSON(MAP.colJson),
      ]);
      this._parseLocations(locData);
      this._parseCollisions(colData);
      this._buildSpatialIndex();

      this.bgImg = await this._loadImage(MAP.bgImage);
      this.loaded = true;
      EventBus.emit('data:loaded', { locations: this.locations });
    } catch (e) {
      console.error('地图数据加载失败:', e);
      EventBus.emit('data:error', e);
      throw e;
    }
  }

  async _fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
    return res.json();
  }

  _loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = url;
    });
  }

  // ---- 地点解析 ----

  _parseLocations(tiled) {
    const layer = tiled.layers.find(l => l.name === 'locations');
    if (!layer || !layer.objects) { this.locations = []; return; }

    this.locations = layer.objects
      .filter(obj => obj.visible !== false)
      .map(obj => {
        const props = this._propsToObject(obj.properties);
        const width = Number(obj.width) || 0;
        const height = Number(obj.height) || 0;
        const isPoint = width === 0 && height === 0;
        const bounds = isPoint
          ? {
              x: obj.x - POINT_HIT_RADIUS,
              y: obj.y - POINT_HIT_RADIUS,
              width: POINT_HIT_RADIUS * 2,
              height: POINT_HIT_RADIUS * 2,
            }
          : { x: obj.x, y: obj.y, width, height };

        return {
          map_id: Number(props.map_id ?? obj.id),
          map_name: obj.name,
          map_type: obj.type || 'landmark',
          x: isPoint ? obj.x : obj.x + width / 2,
          y: isPoint ? obj.y : obj.y + height / 2,
          width,
          height,
          bounds,
          rawX: obj.x,
          rawY: obj.y,
          description: props.description || '',
        };
      });
  }

  _propsToObject(properties = []) {
    return Object.fromEntries(properties.map(p => [p.name, p.value]));
  }

  // ---- 碰撞解析 ----

  _parseCollisions(data) {
    if (!data) return;
    const objLayer = data.layers?.find(l => l.name === '碰撞层');
    if (!objLayer || !objLayer.objects) return;
    this.collisionPolys = [];
    this._collisionEntries = [];
    for (const obj of objLayer.objects) {
      let poly = null;
      if (obj.polygon) {
        poly = obj.polygon.map(p => ({ x: obj.x + p.x, y: obj.y + p.y }));
      } else if (obj.width != null && obj.height != null) {
        poly = [
          { x: obj.x, y: obj.y },
          { x: obj.x + obj.width, y: obj.y },
          { x: obj.x + obj.width, y: obj.y + obj.height },
          { x: obj.x, y: obj.y + obj.height },
        ];
      }
      if (!poly?.length) continue;
      const bounds = this._polyBounds(poly);
      this._collisionEntries.push({ poly, bounds });
      this.collisionPolys.push(poly);
    }
  }

  _polyBounds(poly) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of poly) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  // ---- 空间索引 ----

  _buildSpatialIndex() {
    this._gridCols = Math.ceil(MAP.width / GRID_SIZE);
    this._gridRows = Math.ceil(MAP.height / GRID_SIZE);
    this._locGrid = {};
    this._colGrid = {};

    // 索引地点（覆盖整个对象外接框，而不是只索引左上角）
    this.locations.forEach((loc, i) => {
      for (const key of this._cellsForBounds(loc.bounds)) {
        if (!this._locGrid[key]) this._locGrid[key] = [];
        this._locGrid[key].push(i);
      }
    });

    // 索引碰撞多边形（取 AABB 覆盖的所有格子）
    this._collisionEntries.forEach(({ bounds }, i) => {
      const rect = {
        x: bounds.minX,
        y: bounds.minY,
        width: bounds.maxX - bounds.minX,
        height: bounds.maxY - bounds.minY,
      };
      for (const key of this._cellsForBounds(rect)) {
        if (!this._colGrid[key]) this._colGrid[key] = [];
        this._colGrid[key].push(i);
      }
    });
  }

  _cellsForBounds(bounds) {
    const x1 = Math.max(0, Math.floor(bounds.x / GRID_SIZE));
    const y1 = Math.max(0, Math.floor(bounds.y / GRID_SIZE));
    const x2 = Math.min(this._gridCols - 1, Math.floor((bounds.x + bounds.width) / GRID_SIZE));
    const y2 = Math.min(this._gridRows - 1, Math.floor((bounds.y + bounds.height) / GRID_SIZE));
    const cells = [];
    for (let gx = x1; gx <= x2; gx++) {
      for (let gy = y1; gy <= y2; gy++) {
        cells.push(`${gx},${gy}`);
      }
    }
    return cells;
  }

  _gridKey(x, y) {
    const gx = Math.floor(x / GRID_SIZE);
    const gy = Math.floor(y / GRID_SIZE);
    if (gx < 0 || gx >= this._gridCols || gy < 0 || gy >= this._gridRows) return null;
    return `${gx},${gy}`;
  }

  // ---- 碰撞检测（利用空间索引） ----

  _pointOnSegment(px, py, a, b, tolerance = 0.75) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return Math.hypot(px - a.x, py - a.y) <= tolerance;
    const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / lenSq));
    const x = a.x + t * dx;
    const y = a.y + t * dy;
    return Math.hypot(px - x, py - y) <= tolerance;
  }

  _pointInPoly(px, py, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y;
      const xj = poly[j].x, yj = poly[j].y;
      if (this._pointOnSegment(px, py, poly[i], poly[j])) return true;
      if ((yi > py) !== (yj > py) && px < (xj - xi) * (py - yi) / (yj - yi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  checkCollision(x, y) {
    if (x < 0 || x > MAP.width || y < 0 || y > MAP.height) return true;
    const key = this._gridKey(x, y);
    if (!key) return true;
    const polyIndices = new Set();
    const arr = this._colGrid[key];
    if (arr) arr.forEach(i => polyIndices.add(i));
    for (const i of polyIndices) {
      const { poly, bounds } = this._collisionEntries[i];
      if (x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) continue;
      if (this._pointInPoly(x, y, poly)) return true;
    }
    return false;
  }

  // ---- 地点查询 ----

  getLocationById(id) {
    return this.locations.find(l => l.map_id === id);
  }

  getLocationsByType(type) {
    return this.locations.filter(l => l.map_type === type);
  }

  /**
   * 查找距离某世界坐标最近的地点。
   * 有半径时走网格索引；无半径时遍历全部地点，保证 HUD 不漏报。
   */
  getNearestLocation(x, y, maxRadius = Infinity) {
    let best = null, bestDist = Infinity;
    const visited = new Set();
    const candidates = Number.isFinite(maxRadius)
      ? this._locCandidatesInRadius(x, y, maxRadius)
      : this.locations.map((_, i) => i);

    for (const i of candidates) {
      if (visited.has(i)) continue;
      visited.add(i);
      const loc = this.locations[i];
      const d = Math.hypot(loc.x - x, loc.y - y);
      if (d < bestDist && d <= maxRadius) { bestDist = d; best = loc; }
    }
    return best;
  }

  _locCandidatesInRadius(x, y, radius) {
    const rect = { x: x - radius, y: y - radius, width: radius * 2, height: radius * 2 };
    const indices = new Set();
    for (const key of this._cellsForBounds(rect)) {
      const arr = this._locGrid[key];
      if (arr) arr.forEach(i => indices.add(i));
    }
    return [...indices];
  }

  _pointInLocation(wx, wy, loc, threshold) {
    const b = loc.bounds;
    return (
      wx >= b.x - threshold &&
      wx <= b.x + b.width + threshold &&
      wy >= b.y - threshold &&
      wy <= b.y + b.height + threshold
    );
  }

  /** 查找点击位置附近的地点（屏幕交互用） */
  findLocationAt(wx, wy, threshold = 25) {
    const visited = new Set();
    const candidates = this._locCandidatesInRadius(wx, wy, threshold);
    let best = null, bestDist = Infinity;
    for (const i of candidates) {
      if (visited.has(i)) continue;
      visited.add(i);
      const loc = this.locations[i];
      if (!this._pointInLocation(wx, wy, loc, threshold)) continue;
      const d = Math.hypot(loc.x - wx, loc.y - wy);
      if (d < bestDist) { best = loc; bestDist = d; }
    }
    return best;
  }

  getAllLocations()   { return this.locations; }
  getCollisionPolys()  { return this.collisionPolys; }
  getCollisionEntries() { return this._collisionEntries; }
}

export const mapData = new MapData();
