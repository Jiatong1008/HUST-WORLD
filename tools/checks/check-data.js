const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkData() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('🔍 检查数据库数据...\n');

    // 检查社团
    const [clubs] = await connection.execute('SELECT * FROM clubs');
    console.log(`📊 社团数量: ${clubs.length}`);
    clubs.forEach(club => {
      console.log(`  - ${club.club_name} (${club.club_type})`);
    });

    console.log('');

    // 检查社团任务
    const [clubTasks] = await connection.execute('SELECT * FROM club_tasks');
    console.log(`📋 社团任务数量: ${clubTasks.length}`);
    clubTasks.forEach(task => {
      console.log(`  - ${task.task_name} (社团ID: ${task.club_id})`);
    });

    console.log('');

    // 检查NPC
    const [npcs] = await connection.execute('SELECT * FROM npcs');
    console.log(`👤 NPC数量: ${npcs.length}`);
    npcs.forEach(npc => {
      console.log(`  - ${npc.npc_name} (${npc.npc_type})`);
    });

    console.log('');

    // 检查地图
    const [maps] = await connection.execute('SELECT * FROM maps');
    console.log(`🗺️  地图数量: ${maps.length}`);
    maps.forEach(map => {
      console.log(`  - ${map.map_name}`);
    });

    console.log('');
    console.log('✅ 检查完成!');

    await connection.end();
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  }
}

checkData();
