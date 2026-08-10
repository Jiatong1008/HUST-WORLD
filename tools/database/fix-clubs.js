const mysql = require('mysql2/promise');
require('dotenv').config();

// 前端期望的社团数据（匹配前端 CampusModules.js 中的 CLUBS 数组）
const FRONTEND_CLUBS = [
  {
    club_id: 1,
    club_name: '蓝桥编程社',
    club_icon: '⌨️',
    club_type: 'academic',
    description: '一起刷题、做项目、参加程序设计竞赛。',
    max_members: 50,
    requirements: JSON.stringify({ grade: 1 })
  },
  {
    club_id: 2,
    club_name: '光影跑酷社',
    club_icon: '🏃',
    club_type: 'sports',
    description: '在校园地图里挑战反应力和节奏感。',
    max_members: 80,
    requirements: JSON.stringify({ grade: 1 })
  },
  {
    club_id: 3,
    club_name: '喻园摄影协会',
    club_icon: '📷',
    club_type: 'art',
    description: '记录校园地标，完成探索打卡作品集。',
    max_members: 60,
    requirements: JSON.stringify({ grade: 1 })
  },
  {
    club_id: 4,
    club_name: '百景志愿队',
    club_icon: '🤝',
    club_type: 'other',
    description: '参与校园服务任务，提升社交与实践能力。',
    max_members: 100,
    requirements: JSON.stringify({ grade: 1 })
  },
];

// 对应的社团任务（匹配前端 CampusModules.js 中的 CLUB_TASKS 数组）
const FRONTEND_CLUB_TASKS = [
  { club_id: 1, task_name: '完成一题最短路练习', task_type: 'daily', description: '用 Dijkstra 或 A* 思路完成一次路线规划练习', difficulty: 'easy', reward: JSON.stringify({ experience: 30, social: 5 }) },
  { club_id: 1, task_name: '维护校园地图小工具', task_type: 'competition', description: '给地图系统补充一个实用交互功能', difficulty: 'medium', reward: JSON.stringify({ experience: 60, money: 10 }) },
  { club_id: 2, task_name: '完成一次跑酷挑战', task_type: 'daily', description: '进入操场跑酷小游戏并获得 500 分', difficulty: 'easy', reward: JSON.stringify({ physical: 30, experience: 20 }) },
  { club_id: 2, task_name: '组织跑酷比赛', task_type: 'team_building', description: '策划并组织一次校园跑酷比赛', difficulty: 'medium', reward: JSON.stringify({ physical: 50, experience: 40 }) },
  { club_id: 3, task_name: '校园打卡拍照', task_type: 'daily', description: '在校园地标完成一次拍照打卡', difficulty: 'easy', reward: JSON.stringify({ experience: 25, social: 10 }) },
  { club_id: 3, task_name: '摄影作品展', task_type: 'performance', description: '准备作品参加校园摄影展', difficulty: 'hard', reward: JSON.stringify({ experience: 80, money: 50 }) },
  { club_id: 4, task_name: '校园志愿服务', task_type: 'daily', description: '完成一次校园志愿服务', difficulty: 'easy', reward: JSON.stringify({ social: 20, experience: 25 }) },
  { club_id: 4, task_name: '组织志愿活动', task_type: 'team_building', description: '策划并组织一次志愿活动', difficulty: 'medium', reward: JSON.stringify({ social: 40, experience: 50 }) },
];

async function fixClubs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('开始修复社团数据...');

    // 清空现有数据
    await connection.execute('DELETE FROM club_tasks');
    await connection.execute('DELETE FROM character_clubs');
    await connection.execute('DELETE FROM clubs');
    console.log('已清空现有社团数据');

    // 插入前端期望的社团数据
    for (const club of FRONTEND_CLUBS) {
      await connection.execute(
        `INSERT INTO clubs (club_id, club_name, club_icon, club_type, description, max_members, requirements)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [club.club_id, club.club_name, club.club_icon, club.club_type, club.description, club.max_members, club.requirements]
      );
      console.log(`已插入社团: ${club.club_name}`);
    }

    // 插入对应的社团任务
    for (const task of FRONTEND_CLUB_TASKS) {
      await connection.execute(
        `INSERT INTO club_tasks (club_id, task_name, task_type, description, difficulty, reward)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [task.club_id, task.task_name, task.task_type, task.description, task.difficulty, task.reward]
      );
      console.log(`已插入任务: ${task.task_name}`);
    }

    console.log('\n✅ 社团数据修复完成！');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 修复失败:', error);
    process.exit(1);
  }
}

fixClubs();
