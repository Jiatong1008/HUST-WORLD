/**
 * ★ 新功能模块模板 ★
 *
 * 复制此文件并重命名为你的功能名.js（如 Weather.js、NPC.js）
 * 然后在 main.js 末尾添加一行 import 即可接入系统。
 *
 * --------------------------------------------------------
 * 📖 接入指南
 * --------------------------------------------------------
 *
 * 1. 复制本文件 → 重命名 → 在此写你的代码
 * 2. 在 main.js 文件末尾添加：
 *    import './features/你的功能名.js';
 * 3. 刷新浏览器即可看到效果
 *
 * --------------------------------------------------------
 * 📡 核心 API（通过 EventBus 通信）
 * --------------------------------------------------------
 *
 * 【监听事件】
 *   EventBus.on('事件名', (data) => { ... });
 *
 *   'character:move'     — 角色移动    data: { x, y }
 *   'character:teleport' — 角色传送    data: { from: {x,y}, to: {x,y} }
 *   'location:select'    — 选中地点    data: { map_id }
 *   'data:loaded'        — 数据加载完成 data: { locations[] }
 *   'render:pre'         — 主渲染前    data: { ctx, coordSys }
 *   'render:post'        — 主渲染后    data: { ctx, coordSys }
 *   'bus:take'           — 乘坐巴士    data: { from:loc, to:loc }
 *   'viewport:change'    — 视角变化    data: { origin, scale }
 *   'input:key'          — 键盘事件    data: { key, type:'down'|'up' }
 *
 * 【发送事件】
 *   EventBus.emit('事件名', data);
 *
 *   （你也可以自定义新事件，只要不跟现有事件重名即可）
 *
 * 【查询数据】
 *   import { mapData } from '../MapData.js';
 *   mapData.getLocationById(id)           // 按 ID 查地点
 *   mapData.getLocationsByType(type)      // 按类型查地点列表
 *   mapData.getNearestLocation(x, y)      // 最近地点
 *   mapData.checkCollision(x, y)          // 碰撞检测
 *
 *   import { character } from '../Character.js';
 *   character.getPos()                    // 获取角色位置 {x, y}
 *
 *   import { coordSys } from '../CoordSys.js';
 *   coordSys.worldToScreen(wx, wy)       // 世界坐标 → 屏幕坐标
 *   coordSys.screenToWorld(sx, sy)       // 屏幕坐标 → 世界坐标
 *
 * --------------------------------------------------------
 * 📁 文件位置
 * --------------------------------------------------------
 * 你的新功能放在 js/features/ 目录下。
 * 不要修改核心模块（js/ 根目录的文件），
 * 通过 EventBus 解耦即可。
 */

import { EventBus } from '../EventBus.js';

export class MyFeature {
  constructor() {
    this.name = 'MyFeature';           // 功能名称
    this.enabled = true;               // 是否启用
  }

  /** 初始化 — 注册事件、创建 DOM 等 */
  init() {
    if (!this.enabled) return;

    // 示例：监听角色移动
    this._onMove = ({ x, y }) => {
      // console.log(`[${this.name}] 角色移动到 (${x}, ${y})`);
    };
    EventBus.on('character:move', this._onMove);

    // 示例：数据加载完成后执行初始化
    this._onLoaded = () => {
      // console.log(`[${this.name}] 地图数据已加载，共 ${mapData.getAllLocations().length} 个地点`);
    };
    EventBus.on('data:loaded', this._onLoaded);

    // 示例：在主渲染后叠加绘制
    this._onRender = ({ ctx, coordSys: cs }) => {
      // 在这里用 ctx 绘制你的内容
      // 例如画一个简单的标记：
      // ctx.fillStyle = 'yellow';
      // ctx.fillText('Hello!', 100, 100);
    };
    EventBus.on('render:post', this._onRender);
  }

  /** 销毁 — 清理事件、DOM 等 */
  destroy() {
    EventBus.off('character:move', this._onMove);
    EventBus.off('data:loaded', this._onLoaded);
    EventBus.off('render:post', this._onRender);
  }
}

// ★ 创建实例并初始化（main.js import 本文件时自动执行）
const myFeature = new MyFeature();
myFeature.init();

export default myFeature;
