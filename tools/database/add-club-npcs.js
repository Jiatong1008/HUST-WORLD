const mysql = require('mysql2/promise');
require('dotenv').config();

// 社团负责人NPC数据
const CLUB_NPCS = [
  {
    npc_name: '编程社社长',
    npc_type: 'senior',
    map_id: 15,  // 计算机学院
    x_coordinate: 500,
    y_coordinate: 300,
    dialogue: JSON.stringify({
      greeting: '欢迎来到蓝桥编程社！我们一起刷题、做项目、参加竞赛！',
      tasks: '我们有日常编程练习和社团开发任务等你来完成。',
      join: '想要加入我们吗？只要你热爱编程，就来报名吧！'
    }),
    npc_function: 'club_manager'
  },
  {
    npc_name: '跑酷社社长',
    npc_type: 'senior',
    map_id: 38,  // 西操
    x_coordinate: 400,
    y_coordinate: 500,
    dialogue: JSON.stringify({
      greeting: '嘿！来加入光影跑酷社，一起在校园奔跑吧！',
      tasks: '我们有日常训练和校园跑酷挑战。',
      join: '只要你热爱运动，就来加入我们吧！'
    }),
    npc_function: 'club_manager'
  },
  {
    npc_name: '摄影协会会长',
    npc_type: 'senior',
    map_id: 21,  // 主图书馆
    x_coordinate: 600,
    y_coordinate: 350,
    dialogue: JSON.stringify({
      greeting: '欢迎来到喻园摄影协会！用镜头记录校园美好。',
      tasks: '我们有校园打卡和摄影作品展览活动。',
      join: '热爱摄影？快来加入我们吧！'
    }),
    npc_function: 'club_manager'
  },
  {
    npc_name: '志愿队队长',
    npc_type: 'senior',
    map_id: 18,  // 爱因斯坦广场
    x_coordinate: 450,
    y_coordinate: 400,
    dialogue: JSON.stringify({
      greeting: '百景志愿队欢迎你！一起为校园服务！',
      tasks: '我们有日常志愿服务和组织志愿活动任务。',
      join: '想为校园做贡献？来加入我们吧！'
    }),
    npc_function: 'club_manager'
  }
];

async function addClubNpcs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('开始添加社团负责人NPC...\n');

    // 插入负责人NPC
    const addedNpcIds = [];
    for (let i = 0; i < CLUB_NPCS.length; i++) {
      const npc = CLUB_NPCS[i];
      const [result] = await connection.execute(
        `INSERT INTO npcs (npc_name, npc_type, map_id, x_coordinate, y_coordinate, dialogue, npc_function)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [npc.npc_name, npc.npc_type, npc.map_id, npc.x_coordinate, npc.y_coordinate, npc.dialogue, npc.npc_function]
      );
      addedNpcIds.push({
        npc_id: result.insertId,
        npc_name: npc.npc_name,
        club_id: i + 1
      });
      console.log(`✅ 已添加: ${npc.npc_name} (NPC ID: ${result.insertId})`);
    }

    console.log('\n🎉 社团负责人NPC添加完成！');
    console.log('添加的NPC:');
    addedNpcIds.forEach(n => {
      const clubName = ['蓝桥编程社', '光影跑酷社', '喻园摄影协会', '百景志愿队'][n.club_id - 1];
      console.log(`  - ${n.npc_name} -> ${clubName} (NPC ID: ${n.npc_id})`);
    });

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 添加失败:', error);
    process.exit(1);
  }
}

addClubNpcs();
