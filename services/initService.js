const { pool } = require('../config/db');

const sampleNpcs = [
  { npc_name: '张老师', npc_type: 'teacher', map_id: 1, x_coordinate: 200, y_coordinate: 150 },
  { npc_name: '保安王叔叔', npc_type: 'dormitory_guard', map_id: 1, x_coordinate: 100, y_coordinate: 100 },
  { npc_name: '李学姐', npc_type: 'senior', map_id: 1, x_coordinate: 300, y_coordinate: 200 },
  { npc_name: '食堂阿姨', npc_type: 'canteen_worker', map_id: 1, x_coordinate: 400, y_coordinate: 150 },
  { npc_name: '王学长', npc_type: 'senior', map_id: 1, x_coordinate: 350, y_coordinate: 250 },
  { npc_name: '赵老师', npc_type: 'teacher', map_id: 1, x_coordinate: 150, y_coordinate: 200 },
  { npc_name: '音乐社社长', npc_type: 'other', map_id: 1, x_coordinate: 250, y_coordinate: 300 },
  { npc_name: '动漫社社长', npc_type: 'other', map_id: 1, x_coordinate: 450, y_coordinate: 300 },
  { npc_name: '篮球社社长', npc_type: 'other', map_id: 1, x_coordinate: 500, y_coordinate: 200 },
  { npc_name: '足球社社长', npc_type: 'other', map_id: 1, x_coordinate: 550, y_coordinate: 250 },
  { npc_name: '游戏社社长', npc_type: 'other', map_id: 1, x_coordinate: 600, y_coordinate: 300 },
  { npc_name: '舞蹈社社长', npc_type: 'other', map_id: 1, x_coordinate: 650, y_coordinate: 350 }
];

const sampleClubs = [
  { club_name: '音乐社', club_type: 'music', description: '一起玩音乐，享受音乐的魅力' },
  { club_name: '动漫社', club_type: 'art', description: 'ACG爱好者的聚集地' },
  { club_name: '篮球社', club_type: 'sports', description: '挥洒汗水，释放青春' },
  { club_name: '足球社', club_type: 'sports', description: '绿茵场上的激情' },
  { club_name: '游戏社', club_type: 'other', description: '电子竞技爱好者的天堂' },
  { club_name: '舞蹈社', club_type: 'art', description: '用舞蹈表达自我' }
];

async function initializeData() {
  const [npcs] = await pool.execute('SELECT * FROM npcs');
  const [maps] = await pool.execute('SELECT * FROM maps');
  const [clubs] = await pool.execute('SELECT * FROM clubs');

  if (npcs.length === 0) {
    for (const npc of sampleNpcs) {
      await pool.execute(
        'INSERT INTO npcs (npc_name, npc_type, map_id, x_coordinate, y_coordinate) VALUES (?, ?, ?, ?, ?)',
        [npc.npc_name, npc.npc_type, npc.map_id, npc.x_coordinate, npc.y_coordinate]
      );
    }
  }

  if (clubs.length === 0) {
    for (const club of sampleClubs) {
      await pool.execute(
        'INSERT INTO clubs (club_name, club_type, description) VALUES (?, ?, ?)',
        [club.club_name, club.club_type, club.description]
      );
    }
  }

  return { npcs: npcs.length, maps: maps.length, clubs: clubs.length };
}

module.exports = { initializeData };
