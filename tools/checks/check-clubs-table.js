const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkTable() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    const [result] = await connection.execute('SHOW CREATE TABLE clubs');
    console.log('📋 clubs 表结构:\n');
    console.log(result[0]['Create Table']);

    await connection.end();
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

checkTable();
