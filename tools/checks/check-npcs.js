const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkNpcs() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    // 查看NPC表结构
    const [tableResult] = await connection.execute('SHOW CREATE TABLE npcs');
    console.log('📋 npcs 表结构:\n');
    console.log(tableResult[0]['Create Table']);

    // 查看现有NPC
    const [npcs] = await connection.execute('SELECT * FROM npcs');
    console.log('\n👤 现有NPC:');
    npcs.forEach(npc => {
      console.log(`  - ${npc.npc_id}: ${npc.npc_name} (${npc.npc_type})`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkNpcs();
