

const mysql = require('mysql2/promise');

// 任务数据配置（使用真实存在的地图位置）
const TASK_DESCRIPTIONS = {
  // 舞蹈社 (club_id:7)
  97: { // 新成员破冰晚会
    summary: '参加社团破冰活动，认识新朋友',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '舞蹈社社长',
    flow: [
      '1. 找到西操场',
      '2. 靠近舞蹈社社长',
      '3. 完成打卡任务',
    ],
  },
  98: { // 日常舞蹈训练
    summary: '参加每周三次的舞蹈训练',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '舞蹈社社长',
    flow: [
      '1. 前往西操场',
      '2. 完成一次舞蹈训练打卡',
    ],
  },
  99: { // 迎新晚会表演
    summary: '参加迎新晚会舞蹈表演',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '舞蹈社社长',
    flow: [
      '1. 找到西操场',
      '2. 在舞台附近完成打卡',
    ],
  },
  100: { // 校园舞蹈大赛
    summary: '代表社团参加校园舞蹈大赛',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '舞蹈社社长',
    flow: [
      '1. 前往西操场',
      '2. 在比赛场地完成打卡',
    ],
  },
  // 音乐社 (club_id:8)
  105: { // 乐队组建会议
    summary: '参加乐队组建会议，确定演奏方向',
    objective: {
      x: 2522,
      y: 1254,
      radius: 150,
      locationName: '集贸市场',
      mode: 'checkin',
    },
    contactNpcName: '音乐社社长',
    flow: [
      '1. 找到集贸市场',
      '2. 与音乐社社长对话',
    ],
  },
  106: { // 乐队排练
    summary: '参加每周乐队排练',
    objective: {
      x: 2522,
      y: 1254,
      radius: 150,
      locationName: '集贸市场',
      mode: 'checkin',
    },
    contactNpcName: '音乐社社长',
    flow: [
      '1. 前往集贸市场',
      '2. 完成排练打卡',
    ],
  },
  // 篮球社 (club_id:9)
  113: { // 新成员见面
    summary: '参加篮球社新成员见面会',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '篮球社社长',
    flow: [
      '1. 前往西操场',
      '2. 在篮球场附近完成打卡',
    ],
  },
  114: { // 日常篮球训练
    summary: '参加每周三次的篮球训练',
    objective: {
      x: 1455,
      y: 1842,
      radius: 150,
      locationName: '西操场',
      mode: 'checkin',
    },
    contactNpcName: '篮球社社长',
    flow: [
      '1. 在西操场找到篮球社成员',
      '2. 完成训练打卡',
    ],
  },
  // 足球社 (club_id:10)
  121: { // 足球队集结
    summary: '参加足球社第一次全员集结',
    objective: {
      x: 5061,
      y: 1831,
      radius: 150,
      locationName: '东操场',
      mode: 'checkin',
    },
    contactNpcName: '足球社社长',
    flow: [
      '1. 找到东操场',
      '2. 在足球场附近完成打卡',
    ],
  },
  122: { // 日常足球训练
    summary: '参加每周足球训练',
    objective: {
      x: 5061,
      y: 1831,
      radius: 150,
      locationName: '东操场',
      mode: 'checkin',
    },
    contactNpcName: '足球社社长',
    flow: [
      '1. 前往东操场',
      '2. 在足球场完成训练打卡',
    ],
  },
  // 动漫社 (club_id:11)
  129: { // 动漫社欢迎会
    summary: '参加动漫社新成员欢迎会',
    objective: {
      x: 2191,
      y: 1882,
      radius: 150,
      locationName: '图书馆',
      mode: 'checkin',
    },
    contactNpcName: '动漫社社长',
    flow: [
      '1. 找到图书馆',
      '2. 在动漫社活动区域完成打卡',
    ],
  },
  130: { // 动漫社日常活动
    summary: '参加动漫社每周活动',
    objective: {
      x: 2191,
      y: 1882,
      radius: 150,
      locationName: '图书馆',
      mode: 'checkin',
    },
    contactNpcName: '动漫社社长',
    flow: [
      '1. 前往图书馆',
      '2. 参加活动并完成打卡',
    ],
  },
  // 游戏社 (club_id:12)
  137: { // 游戏社破冰
    summary: '参加游戏社新成员破冰活动',
    objective: {
      x: 2522,
      y: 1254,
      radius: 150,
      locationName: '集贸市场',
      mode: 'checkin',
    },
    contactNpcName: '游戏社社长',
    flow: [
      '1. 找到集贸市场',
      '2. 与游戏社成员一起完成打卡',
    ],
  },
  138: { // 游戏社每周赛
    summary: '参加游戏社每周线上赛',
    objective: {
      x: 2522,
      y: 1254,
      radius: 150,
      locationName: '集贸市场',
      mode: 'checkin',
    },
    contactNpcName: '游戏社社长',
    flow: [
      '1. 前往集贸市场',
      '2. 完成比赛打卡',
    ],
  },
};

async function updateTasks() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'hust_world',
    charset: 'utf8mb4',
  });

  console.log('🔄 开始更新社团任务数据...\n');

  try {
    const [currentTasks] = await conn.query('SELECT club_task_id, task_name, description FROM club_tasks');

    let updatedCount = 0;
    let skippedCount = 0;

    for (const task of currentTasks) {
      const taskConfig = TASK_DESCRIPTIONS[task.club_task_id];
      
      if (!taskConfig) {
        console.log(`⏭️ 跳过任务 #${task.club_task_id}: ${task.task_name}`);
        skippedCount++;
        continue;
      }

      // 强制更新，不管之前的格式是什么
      const newDescription = JSON.stringify(taskConfig);
      
      await conn.query(
        'UPDATE club_tasks SET description = ? WHERE club_task_id = ?',
        [newDescription, task.club_task_id]
      );

      console.log(`🔄 更新任务 #${task.club_task_id}: ${task.task_name}`);
      updatedCount++;
    }

    console.log(`\n🎉 更新完成! 更新: ${updatedCount}, 跳过: ${skippedCount}`);

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await conn.end();
  }
}

updateTasks();

