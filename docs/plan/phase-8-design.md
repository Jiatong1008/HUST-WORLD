# 第八阶段详细设计：角色成长、背包和技能系统

## 8.5 测试与文档完善

- [x] 审查现有测试脚本（growth / inventory / skills / linkage）
- [x] 统一测试脚本代码风格（PORT、BASE_URL、截图路径、async/await、错误处理）
- [x] 补齐缺失测试场景：
  - [x] growth：连续升级、经验上限、旧 `physical` 迁移
  - [x] inventory：不可叠加物品、商店购买、任务奖励物品
  - [x] skills：技能效果 `examBonus` / `runningBonus` / `socialBonus` / `explorationBonus`
  - [x] linkage：NPC 对话 effects 成长、地图场景日常成长、角色升级后 `maxStamina` 提升
- [x] 检查调试页与对应 main.js 按钮函数一致
- [x] 更新 README.md：汇总 8.1~8.4、测试矩阵、命令列表、调试页地址、已知限制
- [x] 更新 `docs/plan/todo.md` 与 `docs/plan/roadmap.md`：第八阶段全部完成，下一步为第九阶段
- [x] 运行全部测试命令并通过
- [x] 清理测试生成截图
- [x] 提交 git

### 测试矩阵（功能 -> 测试脚本）

| 功能域 | 测试脚本 | 覆盖点 |
|--------|----------|--------|
| 角色成长 | `test:growth` | 等级/经验/属性边界/连续升级/旧 `physical` 字段迁移 |
| 背包与物品 | `test:inventory` | 添加/移除/使用/堆叠/不可叠加物品/商店购买/任务奖励/旧 `items` / `inventoryCounts` 迁移 |
| 技能与熟练度 | `test:skills` | 解锁/升级/经验溢出/考试/跑步/社交/探索加成/任务联动/旧 `unlockedSkills` / `proficiencies` 迁移 |
| 任务系统 | `test:quest` | 接取/推进/完成/追踪/NPC 对话/POI 触发/旧存档迁移 |
| 联动与平衡 | `test:linkage` | 任务奖励统一接入成长/背包/技能、NPC 成长反馈、地图场景日常成长、升级后 `maxStamina` 提升 |
| NPC 与商店 | `test:npc` | 对话、地图 NPC、商店购买 |
| 地图系统 | `test:map` | POI 绑定与场景切换 |
| API 冒烟 | `smoke:api` | 注册/登录/角色/存档/跑步等核心接口 |

### 已知限制与注意事项

- 技能与熟练度数据目前只保存在前端 `progress` 中；后端 `skills` 表只提供静态技能配置，不保存角色等级/经验。
- `equipment` 类型物品（如 `notebook`）配置为 `usable: false`，尚未实现完整装备槽与穿戴属性加成逻辑。
- 背包 `progress.inventory` 已在运行时作为唯一权威数据，旧 `progress.items` / `inventoryCounts` / `sideQuests.inventory` 会在加载时自动迁移。
- 地图场景日常成长在 `QuestMapIntegration` 中通过 `applyStatChanges` 统一入口写入，数值较小，避免挤压任务奖励体验。
- 测试脚本基于 Chromium 的 `msedge` 通道，在 headless 模式下运行；请确保已执行 `npx playwright install`。

### 第八阶段命令列表

```bash
npm run test:growth
npm run test:inventory
npm run test:skills
npm run test:linkage
npm run test:quest
npm run test:npc
npm run test:map
npm run smoke:api
npm run cleanup:smoke
```

### 第八阶段调试页地址

- 角色成长：http://localhost:8080/tools/tests/test-growth-system.html
- 背包与物品：http://localhost:8080/tools/tests/test-inventory-system.html
- 技能与熟练度：http://localhost:8080/tools/tests/test-skills-system.html
- 任务系统：http://localhost:8080/tools/tests/test-quest-system.html
- NPC 对话：http://localhost:8080/tools/tests/test-npc-dialogue.html
- 地图 POI：http://localhost:8080/tools/tests/test-map-poi.html
- 支线任务：http://localhost:8080/tools/tests/test-side-quests.html
- 主线任务：http://localhost:8080/tools/tests/test-main-quest.html

> 如果 `.env` 中修改了 `PORT`，请将示例 URL 中的 `8080` 替换为实际端口。

---

## 8.1 角色成长系统

### 目标

在现有 `QuestTriggerManager` 基础上增强角色成长系统，实现统一属性模型、升级公式、属性边界、升级奖励和属性入口。所有数值变化统一走 `QuestTriggerManager` 的入口，旧存档自动迁移。

### 角色属性模型

角色属性采用扁平结构：

- `level`：角色等级（默认 1）
- `experience`：当前经验值
- `money`：金币
- `maxStamina`：体力上限（默认 100，每升 1 级 +10）
- `stamina`：当前体力（0 ~ maxStamina）
- `knowledge`：知识（0 ~ 100）
- `social`：社交（0 ~ 100）
- `mood`：心情（0 ~ 100）

### 升级公式

```
nextLevelExp = floor(100 * 1.5^(level - 2))
```

- 1 → 2：100
- 2 → 3：150
- 3 → 4：225
- 4 → 5：337
- 5 → 6：506

经验足够时支持连续升级，循环直到经验不足为止。

### 升级奖励

- 体力上限 +10
- 当前体力回满
- knowledge / social / mood 各 +1

### 统一属性入口

在 `QuestTriggerManager` 中实现：

- `applyStatChanges(changes, source)`：统一修改属性，支持 `experience` / `money` / `stamina` / `knowledge` / `social` / `mood`，自动 clamp 和结算升级
- `addExperience(amount, source)`：增加经验并触发 `checkLevelUp()`
- `checkLevelUp()`：循环处理连续升级
- `clampCharacterStats()`：统一属性边界
- `getCharacterGrowthSummary()`：返回角色成长摘要

### 旧存档兼容

如果 `characterStats` 中存在 `physical`，则映射为 `stamina` 并删除旧字段。

### 调试页

`tools/tests/test-growth-system.html`：

- 查看成长摘要
- 增加属性/经验
- 检查升级阈值
- 重置属性
- 全局函数：`debugGetGrowthSummary()`、`debugApplyStatChanges(changes)`、`debugAddExperience(amount)`、`debugCheckLevelUp()`、`debugResetGrowthStats()`

---

## 8.2 背包与物品使用系统

### 目标

统一背包数据结构，完善物品分类和效果，新增测试物品，提供核心管理接口，并兼容旧存档。

### 统一背包数据

`SaveManager.progress` 中使用 `inventory` 作为唯一权威数据：

```json
{
  "progress": {
    "inventory": {
      "coffee": 2,
      "sports_drink": 1,
      "meal_card": 3,
      "notebook": 1,
      "club_badge": 1,
      "lab_pass": 1
    }
  }
}
```

### 物品分类

- `consumable`：消耗品，使用后数量 -1
- `equipment`：装备，可重复穿戴，不消耗数量
- `collectible`：收藏品
- `ticket`：凭证/门票
- `quest`：任务道具
- `material`：材料
- `gift`：礼物

### 新增物品

| 物品 | 类型 | 效果 |
| --- | --- | --- |
| coffee | consumable | stamina +10, knowledge +5 |
| sports_drink | consumable | stamina +15, mood +2 |
| meal_card | consumable | stamina +25, mood +5 |
| notebook | equipment | knowledge +5 |
| club_badge | collectible | - |
| lab_pass | ticket | 解锁实验室 |
| study_notes | material | knowledge +10, experience +5 |
| lab_record | material | knowledge +15, experience +10 |
| thesis_draft | material | experience +20 |

### 核心接口

`InventoryManager`：

- `addItem(itemId, amount, { source })`：增加物品，自动堆叠
- `removeItem(itemId, amount, { source })`：移除物品，数量不足返回失败
- `useItem(itemId, amount, { source })`：使用消耗品
- `applyItemEffects(itemId, { source })`：根据类型应用效果

### 旧存档兼容

迁移 `progress.items` / `inventoryCounts` / `sideQuests.inventory` 到 `progress.inventory`。

### 调试页

`tools/tests/test-inventory-system.html`：

- 查看背包
- 添加/移除/使用物品
- 模拟商店购买和任务奖励
- 测试旧存档迁移
- 全局函数：`debugGetInventory()`、`debugAddItem(itemId, amount)`、`debugRemoveItem(itemId, amount)`、`debugUseItem(itemId)`、`debugApplyItemEffects(itemId)`、`debugMigrateOldInventory()`、`debugResetInventory()`

---

## 8.3 技能与熟练度系统

### 目标

在 `SaveManager.progress` 中建立统一技能数据，新增技能配置，提供核心接口，兼容旧存档，并做轻量玩法联动。

### 统一技能数据

```json
{
  "progress": {
    "skills": {
      "unlocked": ["math_focus"],
      "entries": {
        "math_focus": { "level": 1, "exp": 0, "unlockedAt": 1234567890000 }
      },
      "updatedAt": 1234567890000
    }
  }
}
```

### 技能定义

`game/js/config/SkillConfig.js`：8 个初始技能，覆盖学习、体育、社交、探索、科研五类。

| 技能 | 类别 | 主要效果 |
| --- | --- | --- |
| math_focus | 学习 | examBonus +5% 每级 |
| endurance_training | 体育 | runningBonus +5% 每级，staminaCostReduction +3% 每级 |
| social_butterfly | 社交 | socialBonus +5% 每级，moodGainBonus +5% 每级 |
| exploration_knowledge | 探索 | explorationBonus +5% 每级 |
| lab_expert | 科研 | - |
| quick_learner | 学习 | - |
| team_player | 社交 | - |
| outdoor_athlete | 体育 | - |

### 核心接口

在 `QuestTriggerManager` 中：

- `getSkills()` / `getSkill(skillId)`
- `isSkillUnlocked(skillId)` / `unlockSkill(skillId, source)`
- `addSkillExp(skillId, amount, source)` / `levelUpSkill(skillId, source)`
- `getSkillEffect(effectKey)` / `getSkillSummary()`

### 旧存档兼容

迁移 `progress.unlockedSkills` 和 `progress.proficiencies`。

### 调试页

`tools/tests/test-skills-system.html`：

- 查看技能列表与加成
- 解锁/增加经验/升级
- 模拟学习/考试/跑步/社团/探索任务
- 测试旧存档迁移
- 全局函数：`debugGetSkills()`、`debugUnlockSkill(skillId)`、`debugAddSkillExp(skillId, amount)`、`debugLevelUpSkill(skillId)`、`debugGetSkillSummary()`、`debugMigrateOldSkills()`、`debugResetSkills()`

---

## 8.4 联动与平衡

### 目标

将成长、背包、技能三个系统与任务奖励、NPC 对话、地图场景真正联动，并做数值平衡。

### 统一任务奖励入口

所有奖励统一通过 `QuestTriggerManager._grantRewards()` 发放：

- 数值属性：`applyStatChanges()`
- 物品奖励：`InventoryManager.addItem()`
- 解锁技能：`unlockSkill()`
- 成就/科目：更新 `progress`

### NPC 对话成长反馈

- 对话 effects 通过 `applyStatChanges()` 写入
- 支持升级 Toast
- 支持 `effectsPreview` 预览

### 地图场景日常成长

- 图书馆：knowledge +5, mood +2
- 操场：stamina +2 或 跑步计数 +1
- 食堂：stamina +10, mood +5, money -5
- 实验室：knowledge +5
- 同一点 60 秒冷却

### 数值平衡

- 升级 maxStamina +10
- 每学期推进 maxStamina +10
- 考试失败 stamina -10, mood -5
- 支线默认 10 exp / 5 mood
- 所有数值变化统一走 `applyStatChanges()`

### 测试

`npm run test:linkage` 或 `node tools/tests/browser-test-linkage.js` 真实浏览器验收：

- 任务奖励统一接入成长/背包/技能
- NPC 对话 effects 触发属性变化
- 地图场景日常成长
- 数值边界与升级联动

---

*文档版本：v1.0 | 最后更新：2026-07-11*
