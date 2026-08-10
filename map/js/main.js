/**
 * HUST World 地图系统 — 入口
 *
 * 架构：
 *   main.js (入口 + 轮询)
 *     ├── EventBus.js    (事件通信)
 *     ├── CoordSys.js    (坐标变换)
 *     ├── MapData.js     (数据加载 + 空间索引 + 碰撞)
 *     ├── Renderer.js    (双层 Canvas 渲染)
 *     ├── InputManager.js(键盘 + 鼠标)
 *     ├── Character.js   (角色状态)
 *     ├── BusTravel.js   (巴士传送)
 *     └── UIManager.js   (DOM UI 管理)
 *
 * ★ 小组同学看这里 ★
 *   新功能写在 js/features/ 目录下，
 *   参考 _template.js 模板，通过 EventBus 接入系统。
 *   详见 js/features/README.md
 */

import { EventBus } from './EventBus.js';
import { coordSys } from './CoordSys.js';
import { mapData } from './MapData.js';
import { renderer } from './Renderer.js';
import { inputManager } from './InputManager.js';
import { character } from './Character.js';
import { busTravel } from './BusTravel.js';
import { uiManager } from './UIManager.js';
import { CHARACTER_DEFAULTS, MAP } from './config.js';
import { imageManager } from './ImageManager.js';
import { questMapIntegration } from './features/QuestMapIntegration.js';
import { mapSceneManager } from './features/MapSceneManager.js';
import { npcMapUI, NpcMapUI } from './features/NpcMapUI.js';
import { questPoiBinder } from './features/QuestPoiBinder.js';
import { mapEnhancements } from './features/MapEnhancements.js';

// ---- 初始化 InputManager 的 Canvas ----
inputManager.canvas = renderer.getCanvas();

// ---- 渲染触发 ----
const PATH_GRID = 32;
const PATH_CLEARANCE = 18;
const PATH_MAX_ITERATIONS = 65000;

let needsRender = true;
let walkTarget = null;
let walkDestination = null;
let walkPath = [];
let frameCount = 0;

function triggerRender() {
  needsRender = true;
}

function clearWalkTarget() {
  walkTarget = null;
  walkDestination = null;
  walkPath = [];
  renderer.walkTarget = null;
  renderer.walkTargetLabel = null;
  renderer.walkPath = [];
  triggerRender();
}

class MinHeap {
  constructor() {
    this.items = [];
  }

  get size() {
    return this.items.length;
  }

  push(item) {
    this.items.push(item);
    this._bubbleUp(this.items.length - 1);
  }

  pop() {
    if (!this.items.length) return null;
    const first = this.items[0];
    const last = this.items.pop();
    if (this.items.length && last) {
      this.items[0] = last;
      this._bubbleDown(0);
    }
    return first;
  }

  _less(a, b) {
    return a.f < b.f || (a.f === b.f && a.h < b.h);
  }

  _bubbleUp(index) {
    while (index > 0) {
      const parent = Math.floor((index - 1) / 2);
      if (!this._less(this.items[index], this.items[parent])) break;
      [this.items[index], this.items[parent]] = [this.items[parent], this.items[index]];
      index = parent;
    }
  }

  _bubbleDown(index) {
    while (true) {
      const left = index * 2 + 1;
      const right = left + 1;
      let best = index;
      if (left < this.items.length && this._less(this.items[left], this.items[best])) best = left;
      if (right < this.items.length && this._less(this.items[right], this.items[best])) best = right;
      if (best === index) break;
      [this.items[index], this.items[best]] = [this.items[best], this.items[index]];
      index = best;
    }
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isWalkablePoint(x, y) {
  if (mapData.checkCollision(x, y)) return false;
  const checks = [
    [PATH_CLEARANCE, 0],
    [-PATH_CLEARANCE, 0],
    [0, PATH_CLEARANCE],
    [0, -PATH_CLEARANCE],
    [PATH_CLEARANCE * 0.7, PATH_CLEARANCE * 0.7],
    [PATH_CLEARANCE * 0.7, -PATH_CLEARANCE * 0.7],
    [-PATH_CLEARANCE * 0.7, PATH_CLEARANCE * 0.7],
    [-PATH_CLEARANCE * 0.7, -PATH_CLEARANCE * 0.7],
  ];
  return checks.every(([dx, dy]) => !mapData.checkCollision(x + dx, y + dy));
}

function findNearestWalkablePoint(point, preferredFrom = null, maxRadius = 360) {
  const target = {
    x: clamp(point.x, 0, MAP.width),
    y: clamp(point.y, 0, MAP.height),
  };
  if (isWalkablePoint(target.x, target.y)) return target;

  let best = null;
  let bestScore = Infinity;
  for (let radius = PATH_GRID; radius <= maxRadius; radius += PATH_GRID / 2) {
    const samples = Math.max(16, Math.ceil((Math.PI * 2 * radius) / 18));
    for (let i = 0; i < samples; i++) {
      const angle = (Math.PI * 2 * i) / samples;
      const x = clamp(target.x + Math.cos(angle) * radius, 0, MAP.width);
      const y = clamp(target.y + Math.sin(angle) * radius, 0, MAP.height);
      if (!isWalkablePoint(x, y)) continue;

      const targetDist = Math.hypot(x - target.x, y - target.y);
      const approachDist = preferredFrom ? Math.hypot(x - preferredFrom.x, y - preferredFrom.y) : 0;
      const score = targetDist * 1.8 + approachDist * 0.2;
      if (score < bestScore) {
        bestScore = score;
        best = { x, y };
      }
    }
    if (best) return best;
  }
  return null;
}

function hasLineOfSight(from, to) {
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(dist / 24));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = from.x + (to.x - from.x) * t;
    const y = from.y + (to.y - from.y) * t;
    if (!isWalkablePoint(x, y)) return false;
  }
  return true;
}

function buildWalkPath(to) {
  const from = character.getPos();
  const goalPoint = findNearestWalkablePoint(to, from);
  if (!goalPoint) return [];
  if (hasLineOfSight(from, goalPoint)) return [goalPoint];

  const cols = Math.ceil(MAP.width / PATH_GRID);
  const rows = Math.ceil(MAP.height / PATH_GRID);
  const start = {
    x: Math.max(0, Math.min(cols - 1, Math.floor(from.x / PATH_GRID))),
    y: Math.max(0, Math.min(rows - 1, Math.floor(from.y / PATH_GRID))),
  };
  const goal = {
    x: Math.max(0, Math.min(cols - 1, Math.floor(goalPoint.x / PATH_GRID))),
    y: Math.max(0, Math.min(rows - 1, Math.floor(goalPoint.y / PATH_GRID))),
  };

  const keyOf = (x, y) => `${x},${y}`;
  const blockCache = new Map();
  const centerOf = (x, y) => ({
    x: Math.min(MAP.width, x * PATH_GRID + PATH_GRID / 2),
    y: Math.min(MAP.height, y * PATH_GRID + PATH_GRID / 2),
  });
  const isBlocked = (x, y) => {
    const key = keyOf(x, y);
    if (blockCache.has(key)) return blockCache.get(key);
    const p = centerOf(x, y);
    const blocked = !isWalkablePoint(p.x, p.y);
    blockCache.set(key, blocked);
    return blocked;
  };
  const nearestWalkableCell = (cell, preferredPoint, maxRadius = 14) => {
    if (!isBlocked(cell.x, cell.y)) return cell;
    let best = null;
    let bestDist = Infinity;
    for (let radius = 1; radius <= maxRadius; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== radius) continue;
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          if (nx < 0 || nx >= cols || ny < 0 || ny >= rows || isBlocked(nx, ny)) continue;
          const p = centerOf(nx, ny);
          const dist = Math.hypot(p.x - preferredPoint.x, p.y - preferredPoint.y);
          if (dist < bestDist) {
            bestDist = dist;
            best = { x: nx, y: ny };
          }
        }
      }
      if (best) return best;
    }
    return null;
  };
  const safeStart = nearestWalkableCell(start, from);
  const safeGoal = nearestWalkableCell(goal, goalPoint, 18);
  if (!safeStart || !safeGoal) return [];
  const distCells = (a, b) => {
    const pa = centerOf(a.x, a.y);
    const pb = centerOf(b.x, b.y);
    return Math.hypot(pa.x - pb.x, pa.y - pb.y);
  };
  const heuristic = (x, y) => Math.hypot((safeGoal.x - x) * PATH_GRID, (safeGoal.y - y) * PATH_GRID);
  const open = new MinHeap();
  const nodes = new Map();
  const closed = new Set();
  const startKey = keyOf(safeStart.x, safeStart.y);
  const startNode = { ...safeStart, g: 0, f: heuristic(safeStart.x, safeStart.y), h: heuristic(safeStart.x, safeStart.y), parent: null };
  nodes.set(startKey, startNode);
  open.push(startNode);

  let best = startNode;
  let reached = null;
  let iterations = 0;
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1],
  ];

  while (open.size && iterations++ < PATH_MAX_ITERATIONS) {
    const current = open.pop();
    if (!current) break;
    const currentKey = keyOf(current.x, current.y);
    if (closed.has(currentKey) || nodes.get(currentKey) !== current) continue;

    if (current.x === safeGoal.x && current.y === safeGoal.y) {
      reached = current;
      break;
    }

    closed.add(currentKey);
    if (heuristic(current.x, current.y) < heuristic(best.x, best.y)) best = current;

    for (const [dx, dy] of dirs) {
      const nx = current.x + dx;
      const ny = current.y + dy;
      if (nx < 0 || nx >= cols || ny < 0 || ny >= rows) continue;
      const nKey = keyOf(nx, ny);
      if (closed.has(nKey) || isBlocked(nx, ny)) continue;
      if (dx !== 0 && dy !== 0 && (isBlocked(current.x + dx, current.y) || isBlocked(current.x, current.y + dy))) continue;

      const neighborCell = { x: nx, y: ny };
      const cost = current.g + distCells(current, neighborCell);

      const existing = nodes.get(nKey);
      if (!existing || cost < existing.g) {
        const h = heuristic(nx, ny);
        const next = { x: nx, y: ny, g: cost, f: cost + h, h, parent: current };
        nodes.set(nKey, next);
        open.push(next);
      }
    }
  }

  const endNode = reached || best;
  const cells = [];
  for (let node = endNode; node; node = node.parent) cells.push(node);
  cells.reverse();
  if (cells.length <= 1) return [];

  const roughPath = cells.slice(1).map(c => centerOf(c.x, c.y));
  const lastPoint = roughPath.at(-1) || from;
  if (reached && hasLineOfSight(lastPoint, goalPoint)) roughPath.push(goalPoint);
  return smoothPath(from, roughPath);
}

function smoothPath(from, path) {
  const result = [];
  let anchor = from;
  let i = 0;
  while (i < path.length) {
    let best = i;
    for (let j = path.length - 1; j >= i; j--) {
      if (hasLineOfSight(anchor, path[j])) {
        best = j;
        break;
      }
    }
    result.push(path[best]);
    anchor = path[best];
    i = best + 1;
  }
  return result;
}

function setWalkDestination(point, label = '目标点') {
  const safePoint = findNearestWalkablePoint(point, character.getPos());
  if (!safePoint) {
    clearWalkTarget();
    return;
  }

  const path = buildWalkPath(safePoint);
  if (!path.length) {
    clearWalkTarget();
    return;
  }

  const finalPoint = path.at(-1);
  walkPath = path;
  walkTarget = walkPath[0];
  walkDestination = finalPoint;
  renderer.walkTarget = finalPoint;
  renderer.walkTargetLabel = label;
  renderer.walkPath = walkPath;
  triggerRender();
}

function recomputeWalkPath() {
  if (!walkDestination) return false;
  const path = buildWalkPath(walkDestination);
  if (!path.length) {
    clearWalkTarget();
    return false;
  }
  walkPath = path;
  walkTarget = walkPath[0];
  renderer.walkPath = walkPath;
  renderer.walkTarget = walkDestination;
  triggerRender();
  return true;
}

// 视图变化 → 静态层脏 + 需要渲染
EventBus.on('viewport:change', () => {
  renderer.markDirty();
  triggerRender();
});

// 角色移动 → 需要渲染
EventBus.on('character:move', () => triggerRender());
EventBus.on('character:teleport', () => {
  clearWalkTarget();
  triggerRender();
});

// UI 状态切换
EventBus.on('ui:labels:toggle', (on) => {
  renderer.showLabels = on;
  renderer.markDirty();
  triggerRender();
});
EventBus.on('ui:collision:toggle', (on) => {
  renderer.showCollision = on;
  renderer.markDirty();
  triggerRender();
});

// 地点选择
EventBus.on('location:select', ({ map_id }) => {
  renderer.selectedId = map_id;
  renderer.markDirty();
  triggerRender();
});
EventBus.on('location:click', ({ worldX, worldY, mapId = null, label = null }) => {
  const hit = mapId != null ? mapData.getLocationById(mapId) : mapData.findLocationAt(worldX, worldY);
  EventBus.emit('location:select', { map_id: hit ? hit.map_id : null });
  setWalkDestination({ x: worldX, y: worldY }, label || hit?.map_name || '目标点');
});

// 重置
EventBus.on('ui:reset', () => {
  coordSys.setScale(1);
  coordSys.setOrigin(0, 0);
  character.teleport(CHARACTER_DEFAULTS.startX, CHARACTER_DEFAULTS.startY); // 重置到南大门
  renderer.selectedId = null;
  renderer.showLabels = true;
  renderer.showCollision = false;
  clearWalkTarget();
  renderer.markDirty();
  EventBus.emit('location:select', { map_id: null });
  EventBus.emit('ui:labels:toggle', true);
  EventBus.emit('ui:collision:toggle', false);
  // 同步按钮状态
  ['btnLabels'].forEach(id => document.getElementById(id)?.classList.add('on'));
  ['btnCollision'].forEach(id => document.getElementById(id)?.classList.remove('on'));
  document.getElementById('selTitle') && (document.getElementById('selTitle').textContent = '点击地图选择位置');
  document.getElementById('selInfo') && (document.getElementById('selInfo').innerHTML = '点击地图标记查看详情');
  triggerRender();
});

// 窗口缩放
window.addEventListener('resize', () => {
  renderer.resize();
  coordSys.setViewportSize(renderer.staticCanvas.width, renderer.staticCanvas.height);
  renderer.markDirty();
  triggerRender();
});

// ---- 游戏主循环 ----

/**
 * 游戏主循环。性能优化 5.1d：巴士 proximity 与地图联动更新按帧数降频，
 * 输入响应仍每帧处理，保证移动跟手。
 */
function gameLoop() {
  frameCount++;
  const keys = inputManager.getKeys();
  const prev = inputManager.getPrevKeys();

  // WASD / 方向键移动
  const fast = keys['shift'] || false;
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  if (dx !== 0 || dy !== 0) {
    clearWalkTarget();
    character.move(dx, dy, fast);
  } else if (walkTarget) {
    const ch = character.getPos();
    const tx = walkTarget.x - ch.x;
    const ty = walkTarget.y - ch.y;
    const dist = Math.hypot(tx, ty);
    if (dist <= Math.max(5, character.baseSpeed * 3)) {
      walkPath.shift();
      walkTarget = walkPath[0] || null;
      renderer.walkPath = walkPath;
      if (!walkTarget) clearWalkTarget();
    } else {
      const moved = character.move(tx / dist, ty / dist, false);
      if (!moved && !recomputeWalkPath()) clearWalkTarget();
    }
  }

  // 更新角色位置给渲染器
  renderer._charPos = character.getPos();

  // 巴士近距离检测 —— 每 5 帧执行一次，降低 CPU 占用
  const nearbyStop = (frameCount % 5 === 0) ? busTravel.checkProximity() : renderer.nearbyBusStop;
  renderer.nearbyBusStop = nearbyStop;

  // 任务与地图联动更新 —— 每 3 帧执行一次
  if (frameCount % 3 === 0 && window.questMapIntegration) {
    window.questMapIntegration.update();
  }

  // E 键切换巴士面板
  if (nearbyStop && keys['e'] && !prev['e']) {
    busTravel.togglePanel();
  }
  // Esc 关闭巴士面板
  if (keys['escape'] && !prev['escape'] && busTravel.isPanelVisible()) {
    busTravel.hidePanel();
  }

  // 摄像机跟随角色
  coordSys.centerOn(character.x, character.y, renderer.staticCanvas.width, renderer.staticCanvas.height);

  // 按需渲染
  if (needsRender) {
    renderer.render();
    needsRender = false;
  }

  inputManager.snapshotPrev();
  requestAnimationFrame(gameLoop);
}

// ---- 启动 ----

// 角色创建界面
function createGenderSelection() {
  // 每次都显示性别选择界面，让用户可以重新选择
  // const savedGender = localStorage.getItem('character_gender');
  // if (savedGender) {
  //   return Promise.resolve();
  // }

  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(5, 5, 16, 0.92);
      backdrop-filter: blur(12px) saturate(1.2);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 99999;
      font-family: 'Microsoft YaHei', Arial, sans-serif;
    `;

    const box = document.createElement('div');
    box.style.cssText = `
      background: linear-gradient(160deg, rgba(26, 29, 53, 0.95) 0%, rgba(18, 20, 42, 0.98) 40%, rgba(26, 29, 53, 0.95) 100%);
      border: 1px solid rgba(255,215,0,0.12);
      border-radius: 28px;
      padding: 50px 46px 38px;
      width: 480px;
      box-shadow: 0 30px 80px rgba(0,0,0,0.6), 0 0 120px rgba(255,215,0,0.08), inset 0 1px 0 rgba(255,255,255,0.08);
      position: relative;
    `;

    const headerGradient = document.createElement('div');
    headerGradient.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, transparent, #ffd700, #43c7d6, #ffd700, transparent);
      border-radius: 28px 28px 0 0;
    `;
    box.appendChild(headerGradient);

    box.innerHTML += `
      <h2 style="text-align: center; color: #ffd700; margin-bottom: 34px; font-size: 26px; font-weight: 800; letter-spacing: 3px; text-shadow: 0 0 30px rgba(255,215,0,0.3); position: relative;">
        创建你的角色
        <span style="font-size: 20px; margin-right: 8px;">🎮</span>
      </h2>
      
      <div style="margin-bottom: 26px;">
        <label style="display: block; color: #9ca3af; margin-bottom: 10px; font-size: 14px; font-weight: 700; letter-spacing: 1px;">角色名称</label>
        <input type="text" id="characterName" placeholder="输入你的角色名（2-10个字符）" style="
          width: 100%;
          padding: 15px 16px;
          background: rgba(255,255,255,0.03);
          border: 1.5px solid rgba(255,255,255,0.1);
          border-radius: 12px;
          color: #e5e7eb;
          font-size: 15px;
          outline: none;
          transition: all 0.3s;
          box-sizing: border-box;
        ">
      </div>
      
      <div style="margin-bottom: 26px;">
        <label style="display: block; color: #9ca3af; margin-bottom: 10px; font-size: 14px; font-weight: 700; letter-spacing: 1px;">性别</label>
        <div style="display: flex; gap: 12px;">
          <button id="genderMale" style="
            flex: 1;
            padding: 15px;
            background: rgba(255,255,255,0.02);
            border: 1.5px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            color: #9ca3af;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
          ">♂ 男</button>
          <button id="genderFemale" style="
            flex: 1;
            padding: 15px;
            background: rgba(255,255,255,0.02);
            border: 1.5px solid rgba(255,255,255,0.1);
            border-radius: 12px;
            color: #9ca3af;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
          ">♀ 女</button>
        </div>
      </div>
      
      <button id="nextBtn" disabled style="
        width: 100%;
        padding: 17px;
        background: linear-gradient(135deg, #D4A017, #ffd700, #D4A017);
        background-size: 200% 100%;
        color: #12142a;
        border: none;
        border-radius: 12px;
        font-size: 18px;
        font-weight: 800;
        cursor: pointer;
        transition: all 0.3s;
        margin-top: 16px;
        letter-spacing: 1.5px;
        opacity: 0.5;
      ">下一步：性格测试</button>
      
      <button id="skipBtn" style="
        width: 100%;
        padding: 12px;
        background: transparent;
        border: 1.5px solid rgba(255,255,255,0.1);
        border-radius: 8px;
        color: #6b7280;
        font-size: 13px;
        cursor: pointer;
        transition: all 0.25s;
        margin-top: 10px;
      ">跳过全部，使用默认角色进入</button>
    `;

    overlay.appendChild(box);
    document.body.appendChild(overlay);

    let selectedGender = null;

    const maleBtn = document.getElementById('genderMale');
    const femaleBtn = document.getElementById('genderFemale');
    const nextBtn = document.getElementById('nextBtn');
    const skipBtn = document.getElementById('skipBtn');
    const nameInput = document.getElementById('characterName');

    const updateNextBtn = () => {
      const nameValid = nameInput.value.length >= 2 && nameInput.value.length <= 10;
      nextBtn.disabled = !selectedGender || !nameValid;
      nextBtn.style.opacity = selectedGender && nameValid ? 1 : 0.5;
    };

    maleBtn.addEventListener('click', () => {
      selectedGender = 'male';
      maleBtn.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
      maleBtn.style.borderColor = '#ffd700';
      maleBtn.style.color = '#ffd700';
      maleBtn.style.fontWeight = '700';
      
      femaleBtn.style.background = 'rgba(255,255,255,0.02)';
      femaleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
      femaleBtn.style.color = '#9ca3af';
      femaleBtn.style.fontWeight = 'normal';
      updateNextBtn();
    });

    femaleBtn.addEventListener('click', () => {
      selectedGender = 'female';
      femaleBtn.style.background = 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,215,0,0.05))';
      femaleBtn.style.borderColor = '#ffd700';
      femaleBtn.style.color = '#ffd700';
      femaleBtn.style.fontWeight = '700';
      
      maleBtn.style.background = 'rgba(255,255,255,0.02)';
      maleBtn.style.borderColor = 'rgba(255,255,255,0.1)';
      maleBtn.style.color = '#9ca3af';
      maleBtn.style.fontWeight = 'normal';
      updateNextBtn();
    });

    nameInput.addEventListener('input', updateNextBtn);

    const proceed = (gender) => {
      character.setGender(gender);
      localStorage.setItem('character_name', nameInput.value || '玩家');
      overlay.remove();
      resolve();
    };

    nextBtn.addEventListener('click', () => {
      if (selectedGender) {
        proceed(selectedGender);
      }
    });

    skipBtn.addEventListener('click', () => {
      proceed('male');
    });
  });
}

/**
 * 初始化地图主流程。性能优化 5.1b：任务-POI 绑定延迟到空闲时段执行，
 * 通过 requestIdleCallback / setTimeout 避免阻塞首屏渲染。
 */
async function start() {
  try {
    uiManager.init();    // ★ 必须在 mapData.init() 之前，以便接收 data:loaded 事件
    inputManager.init();
    
    // 加载图片资源
    console.log('[系统] 开始加载图片资源...');
    await imageManager.loadAllImages();
    console.log('[系统] 图片资源加载完成');
    
    // 暴露图片管理器到全局
    window.imageManager = imageManager;
    
    await mapData.init();
    renderer.showCollision = false;
    document.getElementById('btnCollision')?.classList.remove('on');
    EventBus.emit('ui:collision:toggle', false);
    coordSys.setViewportSize(renderer.staticCanvas.width, renderer.staticCanvas.height);
    renderer.render();
    
    // 独立地图页用于展示与调试，直接进入地图，不再弹出角色创建遮罩。
    if (document.body.classList.contains('hw-map-page') || document.body.classList.contains('hw-game-page')) {
      character.setGender(localStorage.getItem('character_gender') || 'male');
      if (!localStorage.getItem('character_name')) localStorage.setItem('character_name', '玩家');
    } else {
      await createGenderSelection();
    }

    // 初始化任务/NPC/场景地图联动模块
    questMapIntegration.init({
      renderer,
      character,
      coordSys,
      mapData,
      eventBus: EventBus,
      inputManager
    });
    if (!mapSceneManager.initialized) mapSceneManager.init();
    await npcMapUI.init();

    // 性能优化 5.1b：任务-POI 绑定计算延迟到空闲时段执行，
    // 避免阻塞首屏与地图初始化。优先 requestIdleCallback，回退 setTimeout(100)。
    const scheduleIdle = (cb) => {
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        window.requestIdleCallback(cb, { timeout: 300 });
      } else {
        setTimeout(cb, 100);
      }
    };
    Promise.resolve().then(() => {
      scheduleIdle(() => {
        questPoiBinder.bindQuestsToMap().catch(err => {
          console.warn('[main] QuestPoiBinder 延迟绑定失败:', err);
        });
      });
    });

    // ===== 融合系统桥接：暴露核心模块到全局作用域 =====
    window._eventBus = EventBus;
    window._character = character;
    window._mapData = mapData;
    window._coordSys = coordSys;
    window._renderer = renderer;
    window._inputManager = inputManager;
    window._busTravel = busTravel;
    window._uiManager = uiManager;
    window._mapEnhancements = mapEnhancements;
    window._mapSystemReady = true;
    window.dispatchEvent(new CustomEvent('mapsystem:ready'));
    console.log('[地图系统] 核心模块已暴露到全局作用域（融合桥接完成）');
    // ===== 融合系统桥接结束 =====
    
    requestAnimationFrame(gameLoop);
  } catch (e) {
    document.body.innerHTML = `<div style="padding:40px;text-align:center;color:#f44;font-size:18px;margin-top:40vh;">
      <h3>数据加载失败</h3><p>${e.message}</p>
      <p style="font-size:12px;color:#aaa;">请确保使用本地服务器打开此页面</p>
      </div>`;
  }
}

start();

export { triggerRender };
