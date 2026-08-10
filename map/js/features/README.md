# 功能扩展指南

## 如何添加新功能

1. 复制 `_template.js`，重命名为你的功能名（如 `NPC.js`）
2. 在模板中写你的代码
3. 在 `main.js` 末尾添加一行：
   ```js
   import './features/NPC.js';
   ```
4. 刷新浏览器

## 核心原则

- **通过 EventBus 通信**，不要直接调用其他模块的方法
- **不要修改 js/ 根目录的核心文件**（config.js、MapData.js 等）
- 你的文件放在 `js/features/` 目录下

## 可监听的系统事件

| 事件名 | 触发时机 | data |
|--------|---------|------|
| `character:move` | 角色移动 | `{ x, y }` |
| `character:teleport` | 角色传送 | `{ from: {x,y}, to: {x,y} }` |
| `location:select` | 选中/取消地点 | `{ map_id }` |
| `data:loaded` | 地图数据加载完成 | `{ locations[] }` |
| `render:pre` | 主渲染之前 | `{ ctx, coordSys }` |
| `render:post` | 主渲染之后 | `{ ctx, coordSys }` |
| `bus:take` | 乘坐巴士 | `{ from:loc, to:loc }` |
| `viewport:change` | 缩放/平移 | `{ origin, scale }` |
| `input:key` | 键盘按下/松开 | `{ key, type:'down'\|'up' }` |

## 可用的数据查询

```js
import { mapData } from '../MapData.js';
import { character } from '../Character.js';
import { coordSys } from '../CoordSys.js';
import { TYPES, BUS_ROUTES } from '../config.js';

// 地点查询
mapData.getLocationById(id)
mapData.getLocationsByType('canteen')
mapData.getNearestLocation(x, y)
mapData.findLocationAt(wx, wy)
mapData.checkCollision(x, y)
mapData.getAllLocations()

// 角色
character.getPos()     // {x, y}

// 坐标变换
coordSys.worldToScreen(wx, wy)
coordSys.screenToWorld(sx, sy)
```

## 建议的功能方向

- **NPC 系统** — 校园里走动的 NPC，可对话
- **任务系统** — 从 NPC 接任务，地图标出目标
- **小地图** — 右上角缩略图
- **天气系统** — 下雨、下雪、雾效果
- **昼夜循环** — 时间滤镜
- **搜索地点** — 侧边栏搜索框
- **路径规划** — A* 寻路，点击自动行走
- **成就系统** — 探索全部地点解锁成就
- **音效系统** — 背景音乐、UI 音效
- **背包物品** — 收集散布在校园的物品
