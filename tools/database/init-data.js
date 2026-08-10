const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'hust_world',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const sampleData = {
  npcs: [
    { npcName: '张老师', npcType: 'teacher', mapId: 1, xCoordinate: 200, yCoordinate: 150, dialogue: JSON.stringify(['欢迎来到华科！', '好好学习，天天向上！']) },
    { npcName: '保安王叔叔', npcType: 'dormitory_guard', mapId: 1, xCoordinate: 100, yCoordinate: 100, dialogue: JSON.stringify(['请出示证件！', '学校安全，人人有责。']) },
    { npcName: '李学姐', npcType: 'senior', mapId: 1, xCoordinate: 300, yCoordinate: 200, dialogue: JSON.stringify(['学弟好！', '有什么问题吗？']) },
    { npcName: '食堂阿姨', npcType: 'canteen_worker', mapId: 1, xCoordinate: 400, yCoordinate: 150, dialogue: JSON.stringify(['同学，想吃点什么？', '今天有优惠活动哦！']) },
    { npcName: '王学长', npcType: 'senior', mapId: 1, xCoordinate: 350, yCoordinate: 250, dialogue: JSON.stringify(['学习之余也要注意休息！', '加油！']) },
    { npcName: '赵老师', npcType: 'teacher', mapId: 1, xCoordinate: 150, yCoordinate: 200, dialogue: JSON.stringify(['这门课很重要！', '认真听讲！']) },
    { npcName: '音乐社社长', npcType: 'other', mapId: 1, xCoordinate: 250, yCoordinate: 300, dialogue: JSON.stringify(['喜欢音乐吗？', '加入我们音乐社吧！']) },
    { npcName: '动漫社社长', npcType: 'other', mapId: 1, xCoordinate: 450, yCoordinate: 300, dialogue: JSON.stringify(['ACG爱好者的天堂！', '快来加入！']) },
    { npcName: '篮球社社长', npcType: 'other', mapId: 1, xCoordinate: 500, yCoordinate: 200, dialogue: JSON.stringify(['挥洒汗水，释放青春！', '来打篮球吧！']) },
    { npcName: '足球社社长', npcType: 'other', mapId: 1, xCoordinate: 550, yCoordinate: 250, dialogue: JSON.stringify(['绿茵场上见！', '踢足球的人最帅了！']) },
    { npcName: '游戏社社长', npcType: 'other', mapId: 1, xCoordinate: 600, yCoordinate: 300, dialogue: JSON.stringify(['游戏爱好者聚集地！', '一起开黑吧！']) },
    { npcName: '舞蹈社社长', npcType: 'other', mapId: 1, xCoordinate: 650, yCoordinate: 350, dialogue: JSON.stringify(['用舞蹈表达自我！', '跳舞使我快乐！']) }
  ],
  
  clubs: [
    { clubName: '音乐社', clubType: 'music', description: '一起玩音乐，享受音乐的魅力', maxMembers: 50 },
    { clubName: '动漫社', clubType: 'art', description: 'ACG爱好者的天堂', maxMembers: 60 },
    { clubName: '篮球社', clubType: 'sports', description: '挥洒汗水，释放青春', maxMembers: 40 },
    { clubName: '足球社', clubType: 'sports', description: '绿茵场上的激情', maxMembers: 35 },
    { clubName: '游戏社', clubType: 'other', description: '电子竞技爱好者的天堂', maxMembers: 80 },
    { clubName: '舞蹈社', clubType: 'art', description: '用舞蹈表达自我', maxMembers: 45 }
  ],
  
  clubTasks: [
    { clubId: 1, taskName: '日常练习', taskType: 'daily', description: '参加社团日常练习', difficulty: 'easy', reward: JSON.stringify({ money: 50, experience: 30, social: 5 }), gradeLimit: null },
    { clubId: 1, taskName: '校园歌手大赛', taskType: 'special', description: '参加校园歌手大赛', difficulty: 'hard', reward: JSON.stringify({ money: 500, experience: 200, social: 20 }), gradeLimit: null },
    { clubId: 3, taskName: '篮球友谊赛', taskType: 'weekly', description: '与其他学院进行友谊赛', difficulty: 'medium', reward: JSON.stringify({ money: 150, experience: 100, physical: 10 }), gradeLimit: null }
  ],
  
  tasks: [
    { taskName: '入学手续', taskType: 'main', description: '完成入学报道手续', requirements: null, reward: JSON.stringify({ money: 200, experience: 100 }), difficulty: 'easy', isActive: true },
    { taskName: '军训第一课', taskType: 'required', description: '参加军训动员大会', requirements: null, reward: JSON.stringify({ money: 100, experience: 50, physical: 10 }), difficulty: 'easy', isActive: true },
    { taskName: '选课指导', taskType: 'main', description: '参加选课指导会', requirements: null, reward: JSON.stringify({ money: 50, experience: 80 }), difficulty: 'easy', isActive: true }
  ],
  
  skills: [
    { skillName: '快速学习', skillType: 'knowledge', description: '提高知识获取效率', effect: JSON.stringify({ knowledgeBonus: 10 }), requiredLevel: 1 },
    { skillName: '社交达人', skillType: 'support', description: '提高社交属性', effect: JSON.stringify({ socialBonus: 10 }), requiredLevel: 2 },
    { skillName: '体能训练', skillType: 'combat', description: '提高物理属性', effect: JSON.stringify({ physicalBonus: 10 }), requiredLevel: 3 }
  ],
  
  items: [
    { itemName: '面包', itemType: 'consumable', description: '恢复少量体力', effect: JSON.stringify({ physicalRestore: 20 }), price: 10, stock: 100 },
    { itemName: '课本', itemType: 'collectible', description: '专业课本', effect: JSON.stringify({ knowledgeBonus: 5 }), price: 50, stock: 30 },
    { itemName: '运动鞋', itemType: 'equipment', description: '运动时穿的鞋', effect: JSON.stringify({ physicalBonus: 3 }), price: 200, stock: 20 }
  ],
  
  maps: [
    { mapName: '南大门', mapType: 'landmark', description: '华中科技大学南大门', xCoordinate: 100, yCoordinate: 100, width: 50, height: 50 },
    { mapName: '图书馆', mapType: 'teaching_building', description: '图书馆学习圣地', xCoordinate: 200, yCoordinate: 200, width: 60, height: 60 },
    { mapName: '西十二楼', mapType: 'teaching_building', description: '著名的教学楼', xCoordinate: 300, yCoordinate: 150, width: 80, height: 80 },
    { mapName: '韵苑食堂', mapType: 'canteen', description: '美味佳肴聚集地', xCoordinate: 150, yCoordinate: 250, width: 50, height: 50 },
    { mapName: '沁苑宿舍', mapType: 'dormitory', description: '温馨的宿舍区', xCoordinate: 250, yCoordinate: 300, width: 70, height: 70 },
    { mapName: '光谷体育馆', mapType: 'playground', description: '大型体育场馆', xCoordinate: 400, yCoordinate: 300, width: 90, height: 90 }
  ],
  
  campusExploration: [
    { mapId: 1, explorationType: 'photo', description: '在南大门拍照打卡', reward: JSON.stringify({ money: 100, experience: 50, social: 10 }) },
    { mapId: 2, explorationType: 'collection', description: '在图书馆借阅一本书', reward: JSON.stringify({ money: 150, experience: 80, knowledge: 15 }) }
  ]
};

async function initSampleData() {
  console.log('🚀 开始初始化示例数据...');
  
  const connection = await pool.getConnection();
  
  try {
    await connection.beginTransaction();
    
    // 检查是否已有数据
    const [existingNpcs] = await connection.execute('SELECT COUNT(*) as count FROM npcs');
    if (existingNpcs[0].count > 0) {
      console.log('⚠️  数据库已有数据，跳过初始化');
      return;
    }
    
    console.log('📦 正在插入示例数据...');
    
    // 插入地图
    for (const map of sampleData.maps) {
      await connection.execute(
        'INSERT INTO maps (map_name, map_type, description, x_coordinate, y_coordinate, width, height) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [map.mapName, map.mapType, map.description, map.xCoordinate, map.yCoordinate, map.width, map.height]
      );
    }
    console.log('✅ 地图数据已插入');
    
    // 插入 NPC
    for (const npc of sampleData.npcs) {
      await connection.execute(
        'INSERT INTO npcs (npc_name, npc_type, map_id, x_coordinate, y_coordinate, dialogue) VALUES (?, ?, ?, ?, ?, ?)',
        [npc.npcName, npc.npcType, npc.mapId, npc.xCoordinate, npc.yCoordinate, npc.dialogue]
      );
    }
    console.log('✅ NPC数据已插入');
    
    // 插入社团
    for (const club of sampleData.clubs) {
      await connection.execute(
        'INSERT INTO clubs (club_name, club_type, description, max_members) VALUES (?, ?, ?, ?)',
        [club.clubName, club.clubType, club.description, club.maxMembers]
      );
    }
    console.log('✅ 社团数据已插入');
    
    // 插入社团任务
    for (const task of sampleData.clubTasks) {
      await connection.execute(
        'INSERT INTO club_tasks (club_id, task_name, task_type, description, difficulty, reward, grade_limit) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [task.clubId, task.taskName, task.taskType, task.description, task.difficulty, task.reward, task.gradeLimit]
      );
    }
    console.log('✅ 社团任务数据已插入');
    
    // 插入任务
    for (const task of sampleData.tasks) {
      await connection.execute(
        'INSERT INTO tasks (task_name, task_type, description, requirements, reward, difficulty, is_active) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [task.taskName, task.taskType, task.description, task.requirements, task.reward, task.difficulty, task.isActive]
      );
    }
    console.log('✅ 任务数据已插入');
    
    // 插入技能
    for (const skill of sampleData.skills) {
      await connection.execute(
        'INSERT INTO skills (skill_name, skill_type, description, effect, required_level) VALUES (?, ?, ?, ?, ?)',
        [skill.skillName, skill.skillType, skill.description, skill.effect, skill.requiredLevel]
      );
    }
    console.log('✅ 技能数据已插入');
    
    // 插入物品
    for (const item of sampleData.items) {
      await connection.execute(
        'INSERT INTO items (item_name, item_type, description, effect, price, stock) VALUES (?, ?, ?, ?, ?, ?)',
        [item.itemName, item.itemType, item.description, item.effect, item.price, item.stock]
      );
    }
    console.log('✅ 物品数据已插入');
    
    // 插入探索点
    for (const exp of sampleData.campusExploration) {
      await connection.execute(
        'INSERT INTO campus_exploration (map_id, exploration_type, description, reward) VALUES (?, ?, ?, ?)',
        [exp.mapId, exp.explorationType, exp.description, exp.reward]
      );
    }
    console.log('✅ 探索点数据已插入');
    
    await connection.commit();
    console.log('🎉 示例数据初始化完成！');
    
  } catch (error) {
    await connection.rollback();
    console.error('❌ 初始化失败:', error);
    throw error;
  } finally {
    connection.release();
    process.exit(0);
  }
}

initSampleData().catch(console.error);
