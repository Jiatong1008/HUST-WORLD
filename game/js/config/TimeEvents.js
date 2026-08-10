/**
 * HUST World - 时间事件配置
 * 
 * 定义基于时间的游戏事件、活动和内容
 */

const TIME_EVENTS = {
    // 课程安排（按时间段）
    CLASSES: {
        // 第1-2节
        morning1: { start: 8, end: 10, name: '第一二节课', days: [1, 2, 3, 4, 5] },
        // 第3-4节
        morning2: { start: 10, end: 12, name: '第三四节课', days: [1, 2, 3, 4, 5] },
        // 第5-6节
        afternoon1: { start: 14, end: 16, name: '第五六节课', days: [1, 2, 3, 4, 5] },
        // 第7-8节
        afternoon2: { start: 16, end: 18, name: '第七八节课', days: [1, 2, 3, 4, 5] },
        // 第9-10节（晚上）
        evening: { start: 19, end: 21, name: '第九十节课', days: [1, 2, 3, 4] }
    },
    
    // 食堂开放时间
    CANTEEN: {
        breakfast: { start: 6, end: 9, name: '早餐时间' },
        lunch: { start: 11, end: 13, name: '午餐时间' },
        dinner: { start: 17, end: 19, name: '晚餐时间' },
        midnight: { start: 21, end: 23, name: '夜宵时间' }
    },
    
    // 图书馆开放时间
    LIBRARY: {
        open: 7,
        close: 22,
        name: '图书馆开放时间'
    },
    
    // 特殊活动（按周次）
    SPECIAL_EVENTS: {
        // 军训（第1-3周，第一学年第一学期）
        militaryTraining: {
            weeks: [1, 2, 3],
            name: '军训期间',
            semesters: [1], // 只在第一学期
            years: [1] // 只在第一学年
        },
        // 百团大战（第4周，第一学年第一学期和第二学年第一学期）
        clubRecruitment: {
            weeks: [4],
            name: '百团大战',
            semesters: [1],
            years: [1, 2] // 第一和第二学年的第一学期
        },
        // 体测（第8周、第16周）
        physicalTest: {
            weeks: [8, 16],
            name: '体质测试周'
        },
        // 校运动会（第8周）
        sportsMeet: { weeks: [8], name: '校运动会' },
        // 期中周（第9周）
        midterm: { weeks: [9], name: '期中考试周' },
        // 选课（第10周）
        courseSelection: { weeks: [10], name: '下学期选课' },
        // 考试周（第20周）
        finalWeek: { weeks: [20], name: '期末考试周' },
        // 放假（第18周）
        vacation: { weeks: [18], name: '寒假/暑假' }
    },
    
    // 节日和特殊日期
    HOLIDAYS: [
        { month: 1, day: 1, name: '元旦' },
        { month: 2, day: 14, name: '情人节' },
        { month: 5, day: 1, name: '劳动节' },
        { month: 5, day: 4, name: '青年节' },
        { month: 6, day: 1, name: '儿童节' },
        { month: 9, day: 10, name: '教师节' },
        { month: 10, day: 1, name: '国庆节' },
        { month: 12, day: 25, name: '圣诞节' }
    ],
    
    // 时间段提示信息
    PERIOD_MESSAGES: {
        '清晨': '一日之计在于晨，去操场晨跑或者去图书馆自习吧！',
        '上午': '上课时间到了，快去教室！',
        '中午': '饭点了，去食堂吃饭吧！',
        '下午': '下午好，可以去参加社团活动或者自习。',
        '晚上': '晚上时间，可以去图书馆或者回宿舍休息。',
        '深夜': '夜深了，早点休息吧，明天还要上课！'
    },
    
    // 按星期推荐的活动
    WEEKDAY_ACTIVITIES: {
        1: [
            '参加升旗仪式',
            '去主教学楼自习',
            '参加周一班会'
        ],
        2: [
            '去图书馆借书',
            '参加社团例会',
            '去体育馆运动'
        ],
        3: [
            '去东九楼上课',
            '参加学术讲座',
            '去韵苑食堂吃饭'
        ],
        4: [
            '去西十二楼自习',
            '参加志愿服务',
            '去青年园散步'
        ],
        5: [
            '周五了，上完课可以放松一下',
            '去操场运动',
            '参加周末活动'
        ],
        6: [
            '周六愉快！可以睡个懒觉',
            '去探索校园',
            '参加社团活动'
        ],
        7: [
            '周日，好好休息调整状态',
            '去图书馆自习',
            '准备下周课程'
        ]
    }
};

/**
 * 获取当前是否为上课时间
 */
function getClassAtTime(time) {
    for (const [key, cls] of Object.entries(TIME_EVENTS.CLASSES)) {
        if (cls.days.includes(time.day) && 
            time.hour >= cls.start && 
            time.hour < cls.end) {
            return cls;
        }
    }
    return null;
}

/**
 * 获取当前食堂是否开放
 */
function getCanteenStatus(time) {
    for (const [key, meal] of Object.entries(TIME_EVENTS.CANTEEN)) {
        if (time.hour >= meal.start && time.hour < meal.end) {
            return { open: true, meal: meal };
        }
    }
    return { open: false, meal: null };
}

/**
 * 获取图书馆是否开放
 */
function getLibraryStatus(time) {
    return {
        open: time.hour >= TIME_EVENTS.LIBRARY.open && 
              time.hour < TIME_EVENTS.LIBRARY.close,
        hours: TIME_EVENTS.LIBRARY
    };
}

/**
 * 获取当前特殊活动
 */
function getSpecialEvents(time) {
    const events = [];
    for (const [key, event] of Object.entries(TIME_EVENTS.SPECIAL_EVENTS)) {
        let shouldShow = event.weeks.includes(time.week);
        
        // 如果指定了学期，检查是否匹配
        if (shouldShow && event.semesters && event.semesters.length > 0) {
            shouldShow = event.semesters.includes(time.semester);
        }
        
        // 如果指定了学年，检查是否匹配
        if (shouldShow && event.years && event.years.length > 0) {
            shouldShow = event.years.includes(time.year);
        }
        
        if (shouldShow) {
            events.push(event);
        }
    }
    return events;
}

/**
 * 检查当前是否为百团大战期间
 */
function isClubRecruitmentTime(time) {
    const event = TIME_EVENTS.SPECIAL_EVENTS.clubRecruitment;
    if (!event.weeks.includes(time.week)) return false;
    if (event.semesters && !event.semesters.includes(time.semester)) return false;
    if (event.years && !event.years.includes(time.year)) return false;
    return true;
}

/**
 * 检查当前是否为体测周
 */
function isPhysicalTestWeek(time) {
    return TIME_EVENTS.SPECIAL_EVENTS.physicalTest.weeks.includes(time.week);
}

/**
 * 获取当前时间段的提示信息
 */
function getPeriodMessage(period) {
    return TIME_EVENTS.PERIOD_MESSAGES[period] || '享受你的校园生活吧！';
}

/**
 * 获取今日推荐活动
 */
function getRecommendedActivities(time) {
    return TIME_EVENTS.WEEKDAY_ACTIVITIES[time.day] || ['探索校园吧！'];
}

// 导出
window.TIME_EVENTS = TIME_EVENTS;
window.getTimeEvents = {
    getClassAtTime,
    getCanteenStatus,
    getLibraryStatus,
    getSpecialEvents,
    getPeriodMessage,
    getRecommendedActivities,
    isClubRecruitmentTime,
    isPhysicalTestWeek
};
