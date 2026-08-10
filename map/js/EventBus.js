/**
 * 事件总线 — 所有模块通过它通信，实现松耦合
 *
 * 【扩展指南】
 * 你的功能模块只需要 import EventBus，然后 on/emit 事件即可：
 *   import { EventBus } from './EventBus.js';
 *   EventBus.on('character:move', (data) => { ... });
 *   EventBus.emit('myFeature:action', { ... });
 *
 * 已注册的核心事件（见下方 ALL_EVENTS 注释）
 */

class _EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, callback) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(callback);
    return () => this.off(event, callback); // 返回取消函数
  }

  off(event, callback) {
    this._listeners.get(event)?.delete(callback);
  }

  emit(event, data) {
    this._listeners.get(event)?.forEach(cb => cb(data));
  }

  /** 监听一次后自动取消 */
  once(event, callback) {
    const wrapper = (data) => { this.off(event, wrapper); callback(data); };
    this.on(event, wrapper);
  }
}

export const EventBus = new _EventBus();

/*
 * ===== 核心事件清单 =====
 *
 * 视图事件：
 *   'viewport:change'   (origin, scale)  缩放/平移
 *   'resize'            (w, h)           窗口大小变化
 *
 * 角色事件：
 *   'character:move'    ({x, y})         角色移动
 *   'character:teleport' ({from, to})    角色传送完成（巴士等）
 *
 * 交互事件：
 *   'location:select'   (map_id|null)    选中/取消地点
 *   'location:click'    ({map_id, x, y}) 点击地图（未命中地点时 map_id=null）
 *   'bus:panel:show'    (stopObject)     显示巴士面板
 *   'bus:panel:hide'    ()               隐藏巴士面板
 *   'bus:take'          ({from, to})     乘坐巴士
 *
 * 数据事件：
 *   'data:loaded'       ()               地图数据加载完成
 *   'data:error'        (error)          数据加载失败
 *
 * 渲染事件：
 *   'render:pre'        (ctx)            主渲染前（可绘制底层内容）
 *   'render:post'       (ctx, coordSys)  主渲染后（可绘制叠加层）
 *
 * UI 状态事件：
 *   'ui:labels:toggle'  (visible)        标签显示切换
 *   'ui:collision:toggle'(visible)       碰撞层显示切换
 */
