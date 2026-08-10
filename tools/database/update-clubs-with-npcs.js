const mysql = require('mysql2/promise');
require('dotenv').config();

// 社团与NPC的映射关系
const CLUB_NPC_MAP = [
  { club_id: 1, npc_id: 328, club_name: '蓝桥编程社', npc_name: '编程社社长' },
  { club_id: 2, npc_id: 329, club_name: '光影跑酷社', npc_name: '跑酷社社长' },
  { club_id: 3, npc_id: 330, club_name: '喻园摄影协会', npc_name: '摄影协会会长' },
  { club_id: 4, npc_id: 331, club_name: '百景志愿队', npc_name: '志愿队队长' }
];

async function updateClubsWithNpcs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('检查clubs表结构...\n');

    // 检查是否有npc_id字段
    const [columns] = await connection.execute('SHOW COLUMNS FROM clubs');
    const hasNpcId = columns.some(col => col.Field === 'npc_id');

    if (!hasNpcId) {
      console.log('添加npc_id字段到clubs表...');
      await connection.execute('ALTER TABLE clubs ADD COLUMN npc_id INT');
      console.log('✅ 已添加npc_id字段\n');
    }

    // 更新社团的NPC关联
    console.log('更新社团的NPC关联...');
    for (const item of CLUB_NPC_MAP) {
      await connection.execute(
        'UPDATE clubs SET npc_id = ? WHERE club_id = ?',
        [item.npc_id, item.club_id]
      );
      console.log(`✅ ${item.club_name} -> ${item.npc_name} (NPC ID: ${item.npc_id})`);
    }

    console.log('\n🎉 社团NPC关联更新完成！');

    // 验证
    console.log('\n验证结果:');
    const [clubs] = await connection.execute(`
      SELECT c.club_id, c.club_name, n.npc_id, n.npc_name 
      FROM clubs c 
      LEFT JOIN npcs n ON c.npc_id = n.npc_id
    `);
    clubs.forEach(club => {
      console.log(`  - ${club.club_name}: ${club.npc_name || '未设置'}`);
    });

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

updateClubsWithNpcs();
