const mysql = require('mysql2/promise');
require('dotenv').config();

async function clearClubTasks() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    await connection.execute('DELETE FROM club_tasks');
    console.log('All club tasks cleared!');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Clear failed:', error);
    process.exit(1);
  }
}

clearClubTasks();
