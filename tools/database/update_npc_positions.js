const mysql = require('mysql2/promise');

// 社团社长正确位置配置
const NPC_POSITIONS = {
  '舞蹈社社长': { x: 1455, y: 1842, map_id: 32 }, // 西操场
  '音乐社社长': { x: 2522, y: 1254, map_id: 23 }, // 集贸市场
  '篮球社社长': { x: 1455, y: 1842, map_id: 32 }, // 西操场
  '足球社社长': { x: 5061, y: 1831, map_id: 30 }, // 东操场
  '动漫社社长': { x: 2191, y: 1882, map_id: 19 }, // 图书馆
  '游戏社社长': { x: 2522, y: 1254, map_id: 23 }, // 集贸市场
};

async function updatePositions() {
  const conn = await mysql.createConnection({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '123456',
    database: 'hust_world',
    charset: 'utf8mb4',
  });

  console.log('🔄 开始更新社团社长位置...\n');

  try {
    for (const [npcName, pos] of Object.entries(NPC_POSITIONS)) {
      await conn.query(
        'UPDATE npcs SET x_coordinate = ?, y_coordinate = ?, map_id = ? WHERE npc_name = ?',
        [pos.x, pos.y, pos.map_id, npcName]
      );
      console.log(`🔄 ${npcName} → (${pos.x}, ${pos.y}) map_id: ${pos.map_id}`);
    }

    console.log('\n🎉 更新完成!');

  } catch (error) {
    console.error('❌ 错误:', error);
  } finally {
    await conn.end();
  }
}

updatePositions();
