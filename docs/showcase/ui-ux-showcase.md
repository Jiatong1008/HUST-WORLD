# HUST WORLD UI/UX 展示材料

本目录沉淀第九阶段 UI/UX 产品化的可展示材料，用于 README 展示、简历项目页、答辩补充页或演示视频脚本。

## 截图清单

| 文件 | 展示重点 |
|------|----------|
| `screenshots/phase9-dashboard-desktop.png` | 游戏主 HUD、角色信息、属性、任务追踪、底部导航 |
| `screenshots/phase9-inventory-mobile.png` | 移动端背包面板、分类筛选、触控尺寸、无水平溢出 |
| `screenshots/phase9-map-desktop.png` | 校园地图 HUD、地图探索入口、地图整体视觉 |
| `screenshots/phase9-npc-dialogue.png` | NPC 对话框、对话进度、选项键位、角色身份信息 |
| `screenshots/phase9-quest-log.png` | 任务日志、任务分类、任务卡片、追踪状态 |

## 生成方式

```bash
npm run test:phase9
```

该命令会启动本地服务，访问关键 UI 页面，检查页面错误与水平溢出，并重新生成截图与验收报告：

- 截图目录：`docs/showcase/screenshots/`
- 报告文件：`docs/showcase/reports/phase-9-ui-ux-final-report.json`

## 第九阶段展示话术

第九阶段将 HUST WORLD 从“功能可用”打磨为“可展示的校园 RPG 产品界面”。我建立了统一的 HUST 校园主题视觉规范，重构了游戏主 HUD、地图 HUD、NPC 对话、任务日志、背包、成长和技能面板；同时补齐移动端响应式、触控目标、键盘焦点和减少动态效果支持。所有界面都保留原有业务系统，没有另起平行 UI 逻辑，并通过 Playwright 浏览器验收脚本持续验证。

## 可写入简历的 UI/UX 亮点

- 建立统一设计 token 与组件样式，覆盖按钮、面板、卡片、标签、徽章、Toast、空状态、加载状态和错误状态。
- 将游戏主界面产品化，实现角色 HUD、任务追踪、成长/背包/技能面板与手动保存反馈。
- 将地图探索界面产品化，实现地图 HUD、POI 面板、室内场景面板、NPC 提示和任务追踪标记。
- 优化 NPC 对话、任务日志、背包和技能面板的信息层级、筛选、键盘操作和移动端体验。
- 新增浏览器自动化验收与展示截图生成脚本，保障 UI 改动可回归、可验证、可展示。
