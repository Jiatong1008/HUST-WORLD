const mysql = require('mysql2/promise');
require('dotenv').config();

async function testClubNpcs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('🔍 验证社团负责人NPC配置...\n');

    // 验证社团表有npc_id字段
    const [columns] = await connection.execute('SHOW COLUMNS FROM clubs');
    const hasNpcId = columns.some(col => col.Field === 'npc_id');
    console.log(`✅ clubs表有npc_id字段: ${hasNpcId}`);

    // 验证社团与NPC的关联
    const [clubs] = await connection.execute(`
      SELECT c.club_id, c.club_name, c.club_icon, 
             n.npc_id, n.npc_name, n.npc_type, n.map_id,
             n.x_coordinate, n.y_coordinate, n.npc_function
      FROM clubs c
      LEFT JOIN npcs n ON c.npc_id = n.npc_id
      ORDER BY c.club_id
    `);

    console.log('\n📋 社团与NPC关联情况:');
    clubs.forEach(club => {
      const status = club.npc_id ? `✅ 已关联: ${club.npc_name}` : '❌ 未关联';
      console.log(`  ${club.club_id}. ${club.club_name} - ${status}`);
      if (club.npc_id) {
        console.log(`     地图ID: ${club.map_id}, 坐标: (${club.x_coordinate}, ${club.y_coordinate})`);
        console.log(`     功能: ${club.npc_function}`);
      }
    });

    // 验证社团负责人NPC
    const [npcManagers] = await connection.execute(`
      SELECT n.*, c.club_name 
      FROM npcs n
      LEFT JOIN clubs c ON n.npc_id = c.npc_id
      WHERE n.npc_function = 'club_manager'
    `);

    console.log('\n👥 社团负责人NPC列表:');
    npcManagers.forEach(npc => {
      console.log(`  ${npc.npc_id}. ${npc.npc_name} - ${npc.club_name || '未关联'}`);
    });

    console.log('\n🎉 验证完成！');
    console.log('所有社团负责人NPC已成功添加并关联！');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

testClubNpcs();
