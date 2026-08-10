# HUST World 时间系统使用说明

## 📅 功能概述

时间系统为游戏提供了完整的校园时间体验，包括：

- **游戏内时间流逝** - 1真实秒 = 1游戏分钟
- **学年/学期/周次管理** - 完整的学年制模拟
- **时间段系统** - 清晨、上午、中午、下午、晚上、深夜
- **时间UI面板** - 右上角显示当前时间和学期进度
- **事件订阅机制** - 基于时间的游戏事件触发
- **时间控制功能** - 暂停、加速、恢复正常速度

## 🎮 时间比例

- **真实时间 1秒** = **游戏时间 1分钟**
- **真实时间 1小时** = **游戏时间 2.5天**
- **真实时间 1天** = **游戏时间 60天** (约1个学期)

## 📊 时间结构

```
学年 (Year)
  └── 学期 (Semester) - 每学年2个学期
       └── 周次 (Week) - 每学期18周
            └── 星期 (Day) - 每周7天
                 └── 时间 (Hour:Minute)
```

## 🎯 UI面板功能

时间面板显示在屏幕右上角，包含：

1. **学年信息** - 第X学年
2. **学期信息** - 第X学期
3. **周次** - 第X周
4. **星期** - 周一至周日
5. **时钟** - HH:MM 格式
6. **时间段** - 清晨/上午/中午/下午/晚上/深夜
7. **学期进度条** - 可视化学期进度
8. **控制按钮** - 暂停/继续、加速、恢复

## 🔧 API使用

### 基本使用

```javascript
// 获取当前时间
const time = window.timeSystem.getTime();
console.log(time);
// { year: 1, semester: 1, week: 1, day: 1, hour: 8, minute: 0 }

// 获取格式化时间字符串
console.log(window.timeSystem.getFormattedTime());
// "1年第1学期 第1周 周一 08:00"

// 获取当前时间段
console.log(window.timeSystem.getTimePeriod());
// "上午"
```

### 时间控制

```javascript
// 暂停时间
window.timeSystem.pause();

// 继续时间
window.timeSystem.start();

// 跳转到指定时间
window.timeSystem.skipTo(14, 30); // 跳转到14:30

// 跳过N天
window.timeSystem.skipDays(3); // 跳过3天

// 设置时间
window.timeSystem.setTime({ week: 5, day: 3, hour: 10 });
```

### 事件订阅

```javascript
// 订阅天变化事件
window.timeSystem.subscribe('dayChange', (event, data) => {
    console.log('新的一天:', data.weekday);
});

// 订阅时间段变化
window.timeSystem.subscribe('periodChange', (event, data) => {
    console.log('现在是:', data.period);
});

// 订阅小时变化
window.timeSystem.subscribe('hourChange', (event, data) => {
    console.log('整点:', data.hour);
});

// 订阅学期事件
window.timeSystem.subscribe('semesterStart', (event, data) => {
    console.log('新学期开始！');
});

window.timeSystem.subscribe('midterm', (event, data) => {
    console.log('期中周到了！');
});

window.timeSystem.subscribe('finalWeek', (event, data) => {
    console.log('期末周到了！');
});

window.timeSystem.subscribe('semesterEnd', (event, data) => {
    console.log('学期结束！');
});

// 订阅所有事件
window.timeSystem.subscribe('*', (event, data) => {
    console.log('事件:', event, data);
});
```

### 定时事件

```javascript
// 在指定时间触发事件
window.timeSystem.scheduleEvent(
    { week: 5, day: 3, hour: 14, minute: 0 },
    (time) => {
        console.log('定时事件触发！', time);
    },
    'my-event-id'
);

// 只指定部分条件（其他条件任意）
window.timeSystem.scheduleEvent(
    { hour: 8 }, // 每天早上8点
    (time) => {
        console.log('早上好！');
    }
);
```

## 📚 时间事件配置 (TIME_EVENTS)

### 课程安排

```javascript
const time = window.timeSystem.getTime();
const currentClass = window.getTimeEvents.getClassAtTime(time);
if (currentClass) {
    console.log('正在上课:', currentClass.name);
}
```

### 食堂状态

```javascript
const canteenStatus = window.getTimeEvents.getCanteenStatus(time);
if (canteenStatus.open) {
    console.log('食堂开放中:', canteenStatus.meal.name);
}
```

### 图书馆状态

```javascript
const libraryStatus = window.getTimeEvents.getLibraryStatus(time);
if (libraryStatus.open) {
    console.log('图书馆开放中');
}
```

### 特殊活动

```javascript
const events = window.getTimeEvents.getSpecialEvents(time);
events.forEach(event => {
    console.log('当前活动:', event.name);
});
```

### 推荐活动

```javascript
const activities = window.getTimeEvents.getRecommendedActivities(time);
console.log('今日推荐:', activities);
```

## 🎪 游戏内事件

时间系统会自动触发以下事件：

| 事件 | 时机 | 说明 |
|------|------|------|
| `hourChange` | 每小时 | 整点触发 |
| `dayChange` | 每天0点 | 新的一天 |
| `periodChange` | 时间段变化 | 清晨/上午/中午等 |
| `weekChange` | 每周一 | 新的一周 |
| `semesterStart` | 第1周 | 学期开始 |
| `midterm` | 第9周 | 期中考试周 |
| `finalWeek` | 第16周 | 期末考试周 |
| `semesterEnd` | 第18周 | 学期结束 |

## 💾 数据持久化

时间系统会自动保存到 `localStorage`：

- 键名: `hust_world_time`
- 格式: JSON 对象
- 自动保存: 每次时间变化时
- 自动加载: 游戏初始化时

## 🔄 示例场景

### 场景1: 课程提醒

```javascript
window.timeSystem.subscribe('hourChange', (event, data) => {
    const time = window.timeSystem.getTime();
    const currentClass = window.getTimeEvents.getClassAtTime(time);
    
    if (currentClass && data.hour === currentClass.start) {
        // 显示课程提醒
        window.questTriggerUI._showToast(
            `📚 ${currentClass.name} 开始了！`,
            '#FF9800',
            4000
        );
    }
});
```

### 场景2: 食堂开饭提醒

```javascript
window.timeSystem.subscribe('hourChange', (event, data) => {
    const time = window.timeSystem.getTime();
    const canteen = window.getTimeEvents.getCanteenStatus(time);
    
    if (canteen.open && canteen.meal) {
        if (data.hour === canteen.meal.start) {
            window.questTriggerUI._showToast(
                `🍽️ ${canteen.meal.name} 到了！`,
                '#4CAF50',
                3000
            );
        }
    }
});
```

### 场景3: 时间段问候

```javascript
window.timeSystem.subscribe('periodChange', (event, data) => {
    const message = window.getTimeEvents.getPeriodMessage(data.period);
    window.questTriggerUI._showToast(
        `🌤️ ${message}`,
        '#2196F3',
        3000
    );
});
```

## 📱 移动端适配

时间面板在移动端会自动缩放并调整位置，确保在小屏幕上也有良好的显示效果。

## 🔧 调试

在浏览器控制台可以查看时间系统日志：

```javascript
// 查看当前时间
console.log(window.timeSystem.getTime());

// 查看格式化时间
console.log(window.timeSystem.getFormattedTime());

// 手动触发时间前进
window.timeSystem.advanceTime(60); // 前进60秒（真实时间）= 1小时（游戏时间）
```

## 📄 相关文件

| 文件 | 说明 |
|------|------|
| `game/js/systems/TimeSystem.js` | 时间系统核心 |
| `game/js/config/TimeEvents.js` | 时间事件配置 |
| `game/index.html` | 游戏入口（集成时间系统） |

---

祝游戏开发顺利！🎮✨
