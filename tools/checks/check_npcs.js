const mysql = require('mysql2/promise');

async function check() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'hust_world',
    charset: 'utf8mb4',
  });
  
  const [rows] = await conn.query('SELECT npc_name, x_coordinate, y_coordinate, map_id FROM npcs WHERE npc_name LIKE "%社长%"');
  console.log('社团社长位置:');
  rows.forEach(row => {
    console.log(`${row.npc_name}: (${row.x_coordinate}, ${row.y_coordinate}) - map_id: ${row.map_id}`);
  });
  
  await conn.end();
}

check();
