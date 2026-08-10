/**
 * 坐标系变换 — 世界坐标 ↔ 屏幕坐标
 */

import { EventBus } from './EventBus.js';
import { MAP } from './config.js';

const MIN_SCALE = 0.35;
const MAX_SCALE = 2.2;

class CoordSys {
  constructor() {
    this.origin = { x: 0, y: 0 };
    this.scale = 1;
    this.viewport = { width: window.innerWidth, height: window.innerHeight };
  }

  worldToScreen(wx, wy) {
    return { x: (wx - this.origin.x) * this.scale, y: (wy - this.origin.y) * this.scale };
  }

  screenToWorld(sx, sy) {
    return { x: sx / this.scale + this.origin.x, y: sy / this.scale + this.origin.y };
  }

  setViewportSize(width, height) {
    this.viewport = { width, height };
    this.setView(this.origin.x, this.origin.y, this.scale);
  }

  _clampOrigin(x, y, scale = this.scale) {
    const maxX = Math.max(0, MAP.width - this.viewport.width / scale);
    const maxY = Math.max(0, MAP.height - this.viewport.height / scale);
    return {
      x: Math.max(0, Math.min(maxX, x)),
      y: Math.max(0, Math.min(maxY, y)),
    };
  }

  _clampScale(scale) {
    return Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(scale) || 1));
  }

  setView(x, y, scale = this.scale) {
    const nextScale = this._clampScale(scale);
    const nextOrigin = this._clampOrigin(x, y, nextScale);
    if (
      nextScale === this.scale &&
      nextOrigin.x === this.origin.x &&
      nextOrigin.y === this.origin.y
    ) return;

    this.scale = nextScale;
    this.origin = nextOrigin;
    EventBus.emit('viewport:change', { origin: this.getOrigin(), scale: this.scale });
  }

  setScale(s) {
    this.setView(this.origin.x, this.origin.y, s);
  }

  setOrigin(x, y) {
    this.setView(x, y, this.scale);
  }

  zoomIn(f = 1.25)  { this.setScale(this.scale * f); }
  zoomOut(f = 1.25) { this.setScale(this.scale / f); }

  zoomAt(screenX, screenY, factor) {
    const before = this.screenToWorld(screenX, screenY);
    const nextScale = this._clampScale(this.scale * factor);
    const nextOriginX = before.x - screenX / nextScale;
    const nextOriginY = before.y - screenY / nextScale;
    this.setView(nextOriginX, nextOriginY, nextScale);
  }

  pan(dx, dy) {
    if (dx === 0 && dy === 0) return;
    this.setOrigin(this.origin.x - dx / this.scale, this.origin.y - dy / this.scale);
  }

  /**
   * 将摄像机居中于某个世界坐标
   */
  centerOn(wx, wy, screenW, screenH) {
    if (screenW && screenH) this.viewport = { width: screenW, height: screenH };
    this.setOrigin(wx - this.viewport.width / (2 * this.scale), wy - this.viewport.height / (2 * this.scale));
  }

  getScale()  { return this.scale; }
  getOrigin() { return { ...this.origin }; }
}

export const coordSys = new CoordSys();
