/**
 * 主渲染器 — 双层 Canvas 分离静态/动态内容
 *
 * 【优化】：
 *   1. 双层 Canvas — 静态层（地图+碰撞+地点）只在视角变化时重绘；
 *      动态层（角色+提示）每帧重绘，开销极小
 *   2. 脏标记 — 只有状态变化时才触发重绘
 *   3. 视口裁剪 — 只绘制屏幕内的碰撞多边形
 *
 * 【扩展】：你的功能模块监听 'render:post' 事件，可在主渲染后叠加绘制
 *   EventBus.on('render:post', ({ ctx, coordSys }) => {
 *     // 使用 ctx 直接在当前 Canvas 上绘制
 *   });
 */

import { coordSys } from './CoordSys.js';
import { mapData } from './MapData.js';
import { TYPES, MAP } from './config.js';
import { EventBus } from './EventBus.js';
import { imageManager } from './ImageManager.js';
import { character } from './Character.js';

class Renderer {
  constructor(container) {
    // 静态层（地图底图 + 碰撞 + 地点标记）
    this.staticCanvas = document.createElement('canvas');
    this.staticCtx = this.staticCanvas.getContext('2d');
    this.staticCanvas.style.position = 'fixed';
    this.staticCanvas.style.top = '0';
    this.staticCanvas.style.left = '0';
    this.staticCanvas.style.zIndex = '0';
    this.staticCanvas.style.pointerEvents = 'none'; // 不响应交互
    this.staticDirty = true;

    // 动态层（角色 + tooltip + UI 叠加，接收交互事件）
    this.dynamicCanvas = document.createElement('canvas');
    this.dynamicCtx = this.dynamicCanvas.getContext('2d');
    this.dynamicCanvas.style.position = 'fixed';
    this.dynamicCanvas.style.top = '0';
    this.dynamicCanvas.style.left = '0';
    this.dynamicCanvas.style.zIndex = '1';

    container.appendChild(this.staticCanvas);
    container.appendChild(this.dynamicCanvas);

    // 状态
    this.showLabels = true;
    this.showCollision = false;
    this.selectedId = null;
    this.nearbyBusStop = null;
    this.walkTarget = null;
    this.walkTargetLabel = null;
    this.walkPath = [];

    this.resize();
  }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    this.staticCanvas.width = this.dynamicCanvas.width = w;
    this.staticCanvas.height = this.dynamicCanvas.height = h;
    this.staticCanvas.style.width = this.dynamicCanvas.style.width = w + 'px';
    this.staticCanvas.style.height = this.dynamicCanvas.style.height = h + 'px';
    this.staticDirty = true;
  }

  // ---- 脏标记 ----

  markDirty() { this.staticDirty = true; }

  // ---- 主渲染 ----

  render() {
    const cs = coordSys;
    const w = this.staticCanvas.width, h = this.staticCanvas.height;
    const dCtx = this.dynamicCtx;

    // 静态层：只在需要时重绘
    if (this.staticDirty) {
      const sCtx = this.staticCtx;
      sCtx.clearRect(0, 0, w, h);

      // 地图底图
      if (mapData.bgImg) {
        const sp = cs.worldToScreen(0, 0);
        sCtx.drawImage(mapData.bgImg, sp.x, sp.y, MAP.width * cs.scale, MAP.height * cs.scale);
      }

      // 碰撞层
      if (this.showCollision) this._drawCollision(sCtx, cs);

      // 地点标记
      this._drawLocations(sCtx, cs);

      this.staticDirty = false;
    }

    // 动态层：每帧重绘（开销小）
    dCtx.clearRect(0, 0, w, h);

    // ★ 扩展钩子：渲染前
    EventBus.emit('render:pre', { ctx: dCtx, coordSys: cs });

    // 选中地点的 tooltip
    if (this.selectedId != null) this._drawTooltip(dCtx, cs);

    // 巴士交互提示
    if (this.nearbyBusStop) this._drawBusHint(dCtx, cs);

    // 自动行走路径与目标
    if (this.walkPath?.length) this._drawWalkPath(dCtx, cs);
    if (this.walkTarget) this._drawWalkTarget(dCtx, cs);
    if (this.walkTarget) this._drawWalkDirection(dCtx, cs);

    // 角色（在最上层）
    this._drawCharacter(dCtx, cs);

    // ★ 扩展钩子：渲染后（你的功能模块在这里叠加绘制）
    EventBus.emit('render:post', { ctx: dCtx, coordSys: cs });
  }

  // ---- 碰撞层绘制（视口裁剪） ----

  _drawCollision(ctx, cs) {
    const entries = mapData.getCollisionEntries();
    if (!entries.length) return;
    const or = cs.getOrigin();
    const vw = this.staticCanvas.width / cs.scale;
    const vh = this.staticCanvas.height / cs.scale;

    for (const { poly, bounds } of entries) {
      if (bounds.maxX < or.x || bounds.minX > or.x + vw || bounds.maxY < or.y || bounds.minY > or.y + vh) continue;

      ctx.beginPath();
      const sp0 = cs.worldToScreen(poly[0].x, poly[0].y);
      ctx.moveTo(sp0.x, sp0.y);
      for (let i = 1; i < poly.length; i++) {
        const spi = cs.worldToScreen(poly[i].x, poly[i].y);
        ctx.lineTo(spi.x, spi.y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(255,0,0,0.25)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,0,0,0.5)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  // ---- 地点标记 ----

  /**
   * 绘制地点标记。性能优化 5.1c：使用 MapData.getLocationsInViewport
   * 替代 getAllLocations，仅渲染视口内的地点。
   */
  _drawLocations(ctx, cs) {
    const scale = cs.getScale();
    const or = cs.getOrigin();
    const vw = this.staticCanvas.width / scale;
    const vh = this.staticCanvas.height / scale;

    const locations = mapData.getLocationsInViewport ? mapData.getLocationsInViewport(or.x, or.y, vw, vh) : mapData.getAllLocations();

    locations.forEach(loc => {
      const cfg = TYPES[loc.map_type];
      if (!cfg) return;
      const b = loc.bounds;
      if (b.x > or.x + vw || b.x + b.width < or.x || b.y > or.y + vh || b.y + b.height < or.y) return;

      const p = cs.worldToScreen(loc.x, loc.y);
      const sel = this.selectedId === loc.map_id;
      const r = sel ? 10 : 6;

      if (sel && loc.width > 0 && loc.height > 0) {
        const bp = cs.worldToScreen(loc.rawX, loc.rawY);
        ctx.fillStyle = `${cfg.color}22`;
        ctx.strokeStyle = cfg.color;
        ctx.lineWidth = 1.5;
        ctx.fillRect(bp.x, bp.y, loc.width * scale, loc.height * scale);
        ctx.strokeRect(bp.x, bp.y, loc.width * scale, loc.height * scale);
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      if (sel) {
        ctx.fillStyle = '#fff'; ctx.fill();
        ctx.strokeStyle = cfg.color; ctx.lineWidth = 3; ctx.stroke();
      } else {
        ctx.fillStyle = cfg.color; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
      }
      if (this.showLabels && scale > 0.6) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "Microsoft YaHei", Arial';
        ctx.textAlign = 'center';
        ctx.fillText(loc.map_name, p.x, p.y + r + 13);
      }
    });
  }

  // ---- Tooltip ----

  _drawTooltip(ctx, cs) {
    const loc = mapData.getLocationById(this.selectedId);
    if (!loc) return;
    const cfg = TYPES[loc.map_type];
    const p = cs.worldToScreen(loc.x, loc.y);
    const tw = 195, th = 70;
    const w = this.staticCanvas.width, h = this.staticCanvas.height;
    const tx = Math.min(Math.max(p.x - tw / 2, 10), w - tw - 10);
    const ty = Math.max(p.y - th - 28, 10);

    ctx.fillStyle = 'rgba(20,20,40,0.92)';
    ctx.strokeStyle = cfg.color; ctx.lineWidth = 2;
    this._roundRect(ctx, tx, ty, tw, th, 8);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.font = 'bold 13px "Microsoft YaHei", Arial';
    ctx.textAlign = 'left';
    ctx.fillText(cfg.icon + ' ' + loc.map_name, tx + 10, ty + 22);
    ctx.fillStyle = '#aaa';
    ctx.font = '11px "Microsoft YaHei", Arial';
    ctx.fillText(cfg.label + ' | (' + loc.x.toFixed(0) + ',' + loc.y.toFixed(0) + ')', tx + 10, ty + 40);
    ctx.fillStyle = '#888';
    ctx.font = '10px "Microsoft YaHei", Arial';
    ctx.fillText(loc.description || '', tx + 10, ty + 56);
  }

  // ---- 角色 ----

  _drawWalkPath(ctx, cs) {
    if (!this.walkPath.length) return;
    const ch = this._charPos || { x: 2526, y: 2773 };
    const points = [ch, ...this.walkPath];

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    points.forEach((point, index) => {
      const p = cs.worldToScreen(point.x, point.y);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(4, 14, 38, 0.34)';
    ctx.lineWidth = 4;
    ctx.setLineDash([]);
    ctx.stroke();

    ctx.beginPath();
    points.forEach((point, index) => {
      const p = cs.worldToScreen(point.x, point.y);
      if (index === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.strokeStyle = 'rgba(255, 224, 138, 0.46)';
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 10]);
    ctx.stroke();

    ctx.setLineDash([]);
    for (let i = 0; i < points.length - 1; i++) {
      if (i % 2 === 0) this._drawRouteArrow(ctx, cs, points[i], points[i + 1]);
    }

    ctx.restore();
  }

  _drawWalkTarget(ctx, cs) {
    const p = cs.worldToScreen(this.walkTarget.x, this.walkTarget.y);
    const t = performance.now() / 450;
    const r = 8 + Math.sin(t) * 1.2;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 224, 138, 0.72)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(p.x - r - 4, p.y);
    ctx.lineTo(p.x - 4, p.y);
    ctx.moveTo(p.x + 4, p.y);
    ctx.lineTo(p.x + r + 4, p.y);
    ctx.moveTo(p.x, p.y - r - 4);
    ctx.lineTo(p.x, p.y - 4);
    ctx.moveTo(p.x, p.y + 4);
    ctx.lineTo(p.x, p.y + r + 4);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255, 224, 138, 0.82)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.2, 0, Math.PI * 2);
    ctx.fill();

    const label = this.walkTargetLabel || '目的地';
    ctx.font = 'bold 12px "Microsoft YaHei", Arial';
    const labelW = Math.min(150, ctx.measureText(label).width + 24);
    const boxX = p.x - labelW / 2;
    const boxY = p.y - r - 34;
    ctx.fillStyle = 'rgba(4, 14, 38, 0.72)';
    ctx.strokeStyle = 'rgba(255, 224, 138, 0.34)';
    this._roundRect(ctx, boxX, boxY, labelW, 24, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(label.length > 8 ? `${label.slice(0, 8)}...` : label, p.x, boxY + 16);
    ctx.restore();
  }

  _drawRouteArrow(ctx, cs, from, to) {
    const a = cs.worldToScreen(from.x, from.y);
    const b = cs.worldToScreen(to.x, to.y);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.hypot(dx, dy);
    if (len < 74) return;

    const angle = Math.atan2(dy, dx);
    const mx = a.x + dx * 0.58;
    const my = a.y + dy * 0.58;
    ctx.save();
    ctx.translate(mx, my);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255, 224, 138, 0.58)';
    ctx.strokeStyle = 'rgba(4, 14, 38, 0.44)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(7, 0);
    ctx.lineTo(-5, -4);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-5, 4);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();
  }

  _drawWalkDirection(ctx, cs) {
    const ch = this._charPos || { x: 2526, y: 2773 };
    const cp = cs.worldToScreen(ch.x, ch.y);
    const dx = this.walkTarget.x - ch.x;
    const dy = this.walkTarget.y - ch.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 8) return;

    const angle = Math.atan2(dy, dx);
    const radius = 34;
    const x = cp.x + Math.cos(angle) * radius;
    const y = cp.y + Math.sin(angle) * radius;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = 'rgba(255, 224, 138, 0.78)';
    ctx.strokeStyle = 'rgba(4, 14, 38, 0.58)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(12, 0);
    ctx.lineTo(-6, -7);
    ctx.lineTo(-3, 0);
    ctx.lineTo(-6, 7);
    ctx.closePath();
    ctx.stroke();
    ctx.fill();
    ctx.restore();

    const text = `${Math.round(dist)}m`;
    ctx.font = 'bold 11px "Microsoft YaHei", Arial';
    const tw = ctx.measureText(text).width + 16;
    ctx.fillStyle = 'rgba(4, 14, 38, 0.58)';
    this._roundRect(ctx, cp.x - tw / 2, cp.y + 26, tw, 22, 11);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 224, 138, 0.78)';
    ctx.textAlign = 'center';
    ctx.fillText(text, cp.x, cp.y + 41);
  }

  _drawCharacter(ctx, cs) {
    const ch = this._charPos || { x: 2526, y: 2773 };
    const p = cs.worldToScreen(ch.x, ch.y);
    const r = 24; // 调整角色图片大小
    const anim = character.getAnimationState ? character.getAnimationState() : {
      direction: 'down',
      isMoving: false,
      lastMoveAt: 0,
    };
    const now = performance.now();
    const phase = anim.isMoving ? (now - anim.lastMoveAt) / 92 : 0;
    const bob = anim.isMoving ? Math.abs(Math.sin(phase)) * 4.2 : 0;
    const sway = anim.isMoving ? Math.sin(phase) * 2.2 : 0;
    const lean = anim.isMoving ? Math.sin(phase) * 0.055 : 0;
    const sideMotion = anim.direction === 'left' || anim.direction === 'right' ? sway : 0;
    const drawX = p.x + sideMotion;
    const drawY = p.y - bob;

    // 尝试获取角色图片
    if (imageManager.isReady()) {
      const gender = character.getGender();
      const playerImage = imageManager.getPlayerImage(gender);
      if (playerImage) {
        // 绘制角色图片，保持原始宽高比
        const imgRatio = playerImage.naturalWidth / playerImage.naturalHeight;
        const imgHeight = r * 2.2; // 减小高度倍数，让玩家和NPC比例更协调
        const imgWidth = imgHeight * imgRatio;

        ctx.save();
        ctx.fillStyle = anim.isMoving ? 'rgba(4, 14, 38, 0.28)' : 'rgba(4, 14, 38, 0.22)';
        ctx.beginPath();
        ctx.ellipse(p.x, p.y + r * 0.86, r * 0.62, r * 0.18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.translate(drawX, drawY);
        ctx.rotate(lean);
        if (anim.direction === 'right') ctx.scale(-1, 1);
        ctx.drawImage(
          playerImage,
          -imgWidth / 2,
          -imgHeight / 2,
          imgWidth,
          imgHeight
        );
        ctx.restore();
        return;
      }
    }

    // 回退到原来的绘制方式（如果图片还没有加载完成）
    ctx.save();
    ctx.fillStyle = 'rgba(4, 14, 38, 0.22)';
    ctx.beginPath();
    ctx.ellipse(p.x, p.y + r + 3, r * 0.65, r * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(drawX, drawY, r + 4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,50,50,0.25)';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(drawX, drawY, r, 0, Math.PI * 2);
    ctx.fillStyle = '#e53935';
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(drawX, drawY, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    if (anim.isMoving) {
      const foot = Math.sin(phase) * 4;
      ctx.fillStyle = 'rgba(255,255,255,0.86)';
      ctx.beginPath();
      ctx.arc(drawX - 7, drawY + r + 4 + foot, 3, 0, Math.PI * 2);
      ctx.arc(drawX + 7, drawY + r + 4 - foot, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // 方向指示
    const arrowAngle = {
      up: -Math.PI / 2,
      right: 0,
      down: Math.PI / 2,
      left: Math.PI,
    }[anim.direction] ?? -Math.PI / 2;
    ctx.save();
    ctx.translate(drawX, drawY);
    ctx.rotate(arrowAngle);
    ctx.beginPath();
    ctx.moveTo(r + 8, 0);
    ctx.lineTo(r - 2, -5);
    ctx.lineTo(r - 2, 5);
    ctx.closePath();
    ctx.fillStyle = '#e53935';
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  // ---- 巴士提示 ----

  _drawBusHint(ctx, cs) {
    const ch = this._charPos || { x: 2526, y: 2773 };
    const cp = cs.worldToScreen(ch.x, ch.y);
    const text = '按 E 乘坐巴士';
    const hintW = ctx.measureText(text).width + 20;
    const hintY = cp.y - 36;

    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    this._roundRect(ctx, cp.x - hintW / 2, hintY - 12, hintW, 24, 12);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px "Microsoft YaHei", Arial';
    ctx.textAlign = 'center';
    ctx.fillText(text, cp.x, hintY + 4);
  }

  // ---- 工具方法 ----

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  /** 获取 Canvas 元素（用于绑定事件） */
  getCanvas() { return this.dynamicCanvas; }
}

export const renderer = new Renderer(document.body);
