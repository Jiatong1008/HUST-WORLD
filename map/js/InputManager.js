/**
 * 输入管理器 — 键盘 + 鼠标 + 触控
 *
 * 【扩展】：监听自定义快捷键
 *   EventBus.on('input:key', ({ key }) => { if (key === 'f') ... });
 */

import { EventBus } from './EventBus.js';
import { coordSys } from './CoordSys.js';

class InputManager {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = {};
    this.prevKeys = {};
    this.isDragging = false;
    this.dragLast = null;
    this.dragStart = null;
    this.didDrag = false;

    this._onClick = this._onClick.bind(this);
    this._onCtxMenu = this._onCtxMenu.bind(this);
    this._onWheel = this._onWheel.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp = this._onKeyUp.bind(this);
  }

  init() {
    const c = this.canvas;
    c.addEventListener('click', this._onClick);
    c.addEventListener('contextmenu', this._onCtxMenu);
    c.addEventListener('wheel', this._onWheel, { passive: false });
    c.addEventListener('mousedown', this._onMouseDown);
    window.addEventListener('mouseup', this._onMouseUp);
    window.addEventListener('mousemove', this._onMouseMove);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { sx: e.clientX - rect.left, sy: e.clientY - rect.top };
  }

  _onClick(e) {
    if (this.didDrag) {
      this.didDrag = false;
      return;
    }
    const { sx, sy } = this._pos(e);
    const wp = coordSys.screenToWorld(sx, sy);
    EventBus.emit('location:click', { worldX: wp.x, worldY: wp.y });
  }

  _onCtxMenu(e) {
    e.preventDefault();
  }

  _onWheel(e) {
    e.preventDefault();
    const { sx, sy } = this._pos(e);
    coordSys.zoomAt(sx, sy, e.deltaY < 0 ? 1.15 : 1 / 1.15);
  }

  _onMouseDown(e) {
    if (e.button === 0 && !e.ctrlKey) {
      this.isDragging = true;
      this.dragLast = { x: e.clientX, y: e.clientY };
      this.dragStart = { x: e.clientX, y: e.clientY };
      this.didDrag = false;
    }
  }

  _onMouseUp() { this.isDragging = false; }

  _onMouseMove(e) {
    if (this.isDragging) {
      const dx = e.clientX - this.dragLast.x;
      const dy = e.clientY - this.dragLast.y;
      if (this.dragStart && Math.hypot(e.clientX - this.dragStart.x, e.clientY - this.dragStart.y) > 4) {
        this.didDrag = true;
      }
      coordSys.pan(-dx, -dy);
      this.dragLast = { x: e.clientX, y: e.clientY };
    }
  }

  _onKeyDown(e) {
    const key = e.key || '';
    this.keys[key.toLowerCase()] = true;
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key.toLowerCase())) {
      e.preventDefault();
    }
    EventBus.emit('input:key', { key: key.toLowerCase(), type: 'down' });
  }

  _onKeyUp(e) {
    const key = e.key || '';
    this.keys[key.toLowerCase()] = false;
    EventBus.emit('input:key', { key: key.toLowerCase(), type: 'up' });
  }

  /** 获取当前按下的键（用于 gameLoop 读取） */
  getKeys() { return this.keys; }
  getPrevKeys() { return this.prevKeys; }
  snapshotPrev() { this.prevKeys = { ...this.keys }; }
}

export const inputManager = new InputManager(null); // canvas 由 main.js 注入
