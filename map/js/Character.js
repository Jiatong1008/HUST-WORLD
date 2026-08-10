/**
 * 角色模块 — 状态管理 + 移动逻辑
 *
 * 【扩展】：监听 character:move 事件来响应角色位置变化
 *   EventBus.on('character:move', ({ x, y }) => { ... });
 */

import { EventBus } from './EventBus.js';
import { mapData } from './MapData.js';
import { CHARACTER_DEFAULTS as CFG, MAP } from './config.js';

class Character {
  constructor() {
    this.x = CFG.startX;
    this.y = CFG.startY;
    this.baseSpeed = CFG.baseSpeed;
    this.fastSpeed = CFG.fastSpeed;
    this.gender = 'male'; // 默认性别
    this.direction = 'down';
    this.isMoving = false;
    this.lastMoveAt = 0;
    this.lastMoveVector = { x: 0, y: 1 };
    this._loadGender();
  }

  /** 从本地存储加载性别 */
  _loadGender() {
    const saved = localStorage.getItem('character_gender');
    if (saved === 'male' || saved === 'female') {
      this.gender = saved;
    }
  }

  /** 设置角色性别 */
  setGender(gender) {
    if (gender === 'male' || gender === 'female') {
      this.gender = gender;
      localStorage.setItem('character_gender', gender);
      EventBus.emit('character:genderChange', { gender: gender });
      return true;
    }
    console.error('[Character] 无效的性别参数:', gender);
    return false;
  }

  /** 获取角色性别 */
  getGender() {
    return this.gender;
  }

  /** 尝试移动，返回是否成功 */
  move(dx, dy, fast = false) {
    if (dx === 0 && dy === 0) return false;
    const spd = fast ? this.fastSpeed : this.baseSpeed;
    const len = Math.hypot(dx, dy) || 1;
    const stepX = (dx / len) * spd;
    const stepY = (dy / len) * spd;

    const moved = this._tryMoveTo(this.x + stepX, this.y + stepY)
      || (stepX !== 0 && this._tryMoveTo(this.x + stepX, this.y))
      || (stepY !== 0 && this._tryMoveTo(this.x, this.y + stepY));

    if (moved) {
      this._updateMovementState(stepX, stepY);
      EventBus.emit('character:move', { x: this.x, y: this.y, direction: this.direction, fast });
    }
    return moved;
  }

  _updateMovementState(dx, dy) {
    this.isMoving = true;
    this.lastMoveAt = performance.now();
    this.lastMoveVector = { x: dx, y: dy };

    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx >= 0 ? 'right' : 'left';
    } else {
      this.direction = dy >= 0 ? 'down' : 'up';
    }
  }

  updateAnimation(now = performance.now()) {
    if (this.isMoving && now - this.lastMoveAt > 140) {
      this.isMoving = false;
    }
  }

  getAnimationState(now = performance.now()) {
    this.updateAnimation(now);
    return {
      direction: this.direction,
      isMoving: this.isMoving,
      lastMoveAt: this.lastMoveAt,
      vector: { ...this.lastMoveVector },
    };
  }

  _tryMoveTo(nx, ny) {
    if (nx < 0 || nx > MAP.width || ny < 0 || ny > MAP.height) return false;
    if (mapData.checkCollision(nx, ny)) return false;

    this.x = nx;
    this.y = ny;
    return true;
  }

  /** 传送（巴士系统使用）：自动夹到地图内，并拒绝落到碰撞区 */
  teleport(x, y) {
    const tx = Math.max(0, Math.min(MAP.width, Math.round(x)));
    const ty = Math.max(0, Math.min(MAP.height, Math.round(y)));
    if (mapData.loaded && mapData.checkCollision(tx, ty)) return false;

    const from = { x: this.x, y: this.y };
    this.x = tx;
    this.y = ty;
    this.isMoving = false;
    EventBus.emit('character:teleport', { from, to: { x: this.x, y: this.y } });
    EventBus.emit('character:move', { x: this.x, y: this.y, direction: this.direction, fast: false });
    return true;
  }

  getPos() { return { x: this.x, y: this.y }; }
}

export const character = new Character();
