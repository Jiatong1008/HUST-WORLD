const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkMaps() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    const [maps] = await connection.execute('SELECT * FROM maps');
    console.log('🗺️ 地图列表:');
    maps.forEach(map => {
      console.log(`  - ${map.map_id}: ${map.map_name}`);
    });

    await connection.end();
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkMaps();
