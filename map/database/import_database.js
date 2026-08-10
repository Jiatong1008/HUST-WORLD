const fs = require('fs/promises');
const path = require('path');
const mysql = require('mysql2/promise');

const DB_NAME = process.env.DB_NAME || 'hust_world';
const ROOT = path.resolve(__dirname);

const FILES = [
  'hust_world_users.sql',
  'hust_world_maps.sql',
  'hust_world_characters.sql',
  'hust_world_clubs.sql',
  'hust_world_club_tasks.sql',
  'hust_world_campus_exploration.sql',
  'hust_world_npcs.sql',
  'hust_world_teleport_stations.sql',
  'hust_world_items.sql',
  'hust_world_skills.sql',
  'hust_world_sports_classes.sql',
  'hust_world_elective_courses.sql',
  'hust_world_innovation_projects.sql',
  'hust_world_tasks.sql',
  'hust_world_routines.sql',
  'hust_world_character_clubs.sql',
  'hust_world_character_club_tasks.sql',
  'hust_world_character_explorations.sql',
  'hust_world_character_items.sql',
  'hust_world_character_skills.sql',
  'hust_world_character_sports_classes.sql',
  'hust_world_character_elective_courses.sql',
  'hust_world_character_innovation_projects.sql',
  'hust_world_character_tasks.sql',
  'hust_world_campus_runs.sql',
  'hust_world_battle_records.sql',
];

const DROP_TABLES = [
  'character_club_tasks',
  'character_clubs',
  'character_explorations',
  'campus_exploration',
  'campus_runs',
  'battle_records',
  'character_elective_courses',
  'character_innovation_projects',
  'character_items',
  'character_skills',
  'character_sports_classes',
  'character_tasks',
  'club_tasks',
  'clubs',
  'npcs',
  'teleport_stations',
  'characters',
  'users',
  'elective_courses',
  'innovation_projects',
  'items',
  'skills',
  'sports_classes',
  'tasks',
  'maps',
  'routines',
];

const EXTRA_DAILY_TASKS = [
  [7, '舞蹈基本功打卡', '完成一次基础拉伸、节奏训练和 30 分钟基本功练习', 'daily', 'easy', { exp: 12, stamina: 4, social: 3 }, 1],
  [7, '舞房卫生轮值', '整理舞房镜面、音响和地面，为下一次排练做准备', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [7, '编舞片段复盘', '观看本周编舞视频并写下三个动作改进点', 'daily', 'medium', { exp: 18, social: 4 }, 1],
  [8, '乐器日常练习', '完成 30 分钟节拍器练习并记录本周练习曲目', 'daily', 'easy', { exp: 12, stamina: 3 }, 1],
  [8, '排练室设备检查', '检查话筒、谱架和音箱连接，保证排练顺利进行', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [8, '新歌试听反馈', '听完社团推荐歌单并提交一条编曲或演唱反馈', 'daily', 'medium', { exp: 18, social: 4 }, 1],
  [9, '投篮训练打卡', '完成定点投篮、罚球和折返跑训练', 'daily', 'easy', { exp: 12, stamina: 8 }, 1],
  [9, '器材归还检查', '训练结束后整理篮球、计分板和训练背心', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [9, '战术板复盘', '复盘一次半场进攻配合并写下改进建议', 'daily', 'medium', { exp: 18, social: 5 }, 1],
  [10, '传停球训练', '完成传球、停球和带球绕杆训练', 'daily', 'easy', { exp: 12, stamina: 8 }, 1],
  [10, '球场维护协助', '协助检查球网、训练锥和场地安全情况', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [10, '比赛录像分析', '观看一段比赛录像并记录三条跑位建议', 'daily', 'medium', { exp: 18, social: 5 }, 1],
  [11, '番剧讨论记录', '参加一次番剧讨论并整理三条观点', 'daily', 'easy', { exp: 12, social: 5 }, 1],
  [11, '社刊素材收集', '为社团社刊收集图片、台词或角色资料', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [11, 'COS道具维护', '检查社团服装、假发和道具的保存情况', 'daily', 'medium', { exp: 18, social: 4 }, 1],
  [12, '游戏夜签到', '参加一次游戏夜活动并完成签到记录', 'daily', 'easy', { exp: 12, social: 5 }, 1],
  [12, '设备调试值班', '检查手柄、电脑和投屏设备，保证活动可用', 'daily', 'easy', { exp: 10, money: 20, social: 3 }, 1],
  [12, '赛后复盘笔记', '复盘一局对战，记录关键决策和可优化点', 'daily', 'medium', { exp: 18, social: 4 }, 1],
];

const TASK_PUBLISHER_NPCS = [
  [300, '舞蹈社任务委员', 'senior', 36, 5030, 1878, 7, '舞蹈社'],
  [301, '音乐社任务委员', 'senior', 36, 5200, 1878, 8, '音乐社'],
  [302, '篮球社任务委员', 'senior', 36, 5030, 1998, 9, '篮球社'],
  [303, '足球社任务委员', 'senior', 36, 5200, 1998, 10, '足球社'],
  [304, '动漫社任务委员', 'senior', 36, 5115, 1852, 11, '动漫社'],
  [305, '游戏社任务委员', 'senior', 36, 5115, 2022, 12, '游戏社'],
];

const CLUB_TASK_CONFIGS = {
  7: {
    clubName: '舞蹈社',
    baseLocation: { mapId: 36, name: '东操舞蹈排练区', x: 5060, y: 1900 },
    eventLocation: { mapId: 18, name: '爱因斯坦广场舞台', x: 5722, y: 1683 },
    newMember: { id: 310, name: '舞蹈社新成员小唐', type: 'senior', mapId: 36, x: 4995, y: 1860 },
    assistant: { id: 311, name: '舞房值班同学阿岚', type: 'senior', mapId: 36, x: 5078, y: 1918 },
    eventLead: { id: 312, name: '舞台统筹学姐林溪', type: 'senior', mapId: 18, x: 5760, y: 1708 },
  },
  8: {
    clubName: '音乐社',
    baseLocation: { mapId: 28, name: '梧桐语排练角', x: 2777, y: 1628 },
    eventLocation: { mapId: 18, name: '爱因斯坦广场临时舞台', x: 5722, y: 1683 },
    newMember: { id: 313, name: '音乐社新成员阿澈', type: 'senior', mapId: 36, x: 5235, y: 1860 },
    assistant: { id: 314, name: '排练室管理员小谱', type: 'senior', mapId: 28, x: 2816, y: 1655 },
    eventLead: { id: 315, name: '音乐节执行学长周燃', type: 'senior', mapId: 18, x: 5684, y: 1716 },
  },
  9: {
    clubName: '篮球社',
    baseLocation: { mapId: 36, name: '东操篮球训练区', x: 5061, y: 1968 },
    eventLocation: { mapId: 37, name: '中心操场比赛区', x: 3219, y: 2322 },
    newMember: { id: 316, name: '篮球社新成员小柏', type: 'senior', mapId: 36, x: 4995, y: 2035 },
    assistant: { id: 317, name: '器材助理阿越', type: 'senior', mapId: 36, x: 5088, y: 2018 },
    eventLead: { id: 318, name: '篮球赛记录员陈宁', type: 'senior', mapId: 37, x: 3290, y: 2360 },
  },
  10: {
    clubName: '足球社',
    baseLocation: { mapId: 36, name: '东操足球训练区', x: 5170, y: 1985 },
    eventLocation: { mapId: 37, name: '中心操场联赛区', x: 3219, y: 2322 },
    newMember: { id: 319, name: '足球社新成员小航', type: 'senior', mapId: 36, x: 5238, y: 2035 },
    assistant: { id: 320, name: '球网维护员阿森', type: 'senior', mapId: 36, x: 5165, y: 2026 },
    eventLead: { id: 321, name: '足球联赛裁判助理许同学', type: 'senior', mapId: 37, x: 3158, y: 2380 },
  },
  11: {
    clubName: '动漫社',
    baseLocation: { mapId: 21, name: '主图书馆讨论区', x: 2191, y: 1882 },
    eventLocation: { mapId: 18, name: '爱因斯坦广场漫展摊位', x: 5722, y: 1683 },
    newMember: { id: 322, name: '动漫社新成员小绘', type: 'senior', mapId: 36, x: 5115, y: 1815 },
    assistant: { id: 323, name: '社刊编辑小墨', type: 'senior', mapId: 21, x: 2240, y: 1910 },
    eventLead: { id: 324, name: '漫展摊主阿芽', type: 'senior', mapId: 18, x: 5748, y: 1640 },
  },
  12: {
    clubName: '游戏社',
    baseLocation: { mapId: 15, name: '计算机学院活动室', x: 4800, y: 2260 },
    eventLocation: { mapId: 31, name: '东校区CBD电竞角', x: 5135, y: 2220 },
    newMember: { id: 325, name: '游戏社新成员小路', type: 'senior', mapId: 36, x: 5115, y: 2060 },
    assistant: { id: 326, name: '设备调试员小旗', type: 'senior', mapId: 15, x: 4860, y: 2290 },
    eventLead: { id: 327, name: '电竞赛务阿野', type: 'senior', mapId: 31, x: 5178, y: 2250 },
  },
};

function buildTaskDetails(task) {
  const config = CLUB_TASK_CONFIGS[task.club_id];
  if (!config) return null;

  const original = task.description || `${config.clubName}任务`;
  const isSpecial = ['performance', 'competition', 'exit_ceremony'].includes(task.task_type);
  const contact = task.task_type === 'team_building' || task.task_type === 'recruitment'
    ? config.newMember
    : (isSpecial ? config.eventLead : config.assistant);
  const location = isSpecial ? config.eventLocation : config.baseLocation;
  const mode = task.task_type === 'team_building' || task.task_type === 'exit_ceremony'
    ? 'talk'
    : 'checkin';

  const modeText = mode === 'talk'
    ? `找到 ${contact.name} 完成对话确认`
    : `到 ${location.name} 附近完成任务打卡`;

  return {
    summary: `${original}。目标：${modeText}。`,
    contactNpcId: contact.id,
    contactNpcName: contact.name,
    targetMapId: location.mapId,
    targetLocation: location.name,
    completionMode: mode,
    flow: [
      `先找${config.clubName}任务委员领取任务`,
      `前往${location.name}`,
      modeText,
      '回到社团任务面板点击完成领取奖励',
    ],
    objective: {
      mode,
      mapId: location.mapId,
      locationName: location.name,
      x: mode === 'talk' ? contact.x : location.x,
      y: mode === 'talk' ? contact.y : location.y,
      radius: mode === 'talk' ? 90 : 180,
      npcId: contact.id,
      npcName: contact.name,
    },
  };
}

async function enrichClubTasks(connection) {
  const [tasks] = await connection.query(`
    SELECT club_task_id, club_id, task_name, description, task_type
    FROM club_tasks
    WHERE club_id BETWEEN 7 AND 12
  `);

  for (const task of tasks) {
    const details = buildTaskDetails(task);
    if (!details) continue;
    await connection.query(
      'UPDATE club_tasks SET description = ? WHERE club_task_id = ?',
      [JSON.stringify(details), task.club_task_id]
    );
  }
}

function buildTaskContactNpcs() {
  return Object.values(CLUB_TASK_CONFIGS).flatMap(config => [
    {
      ...config.newMember,
      dialogue: {
        dialogues: [
          { text: `我是${config.clubName}本月临时协助的新成员。如果你的任务流程写着找我，就站在我附近打开任务面板完成确认。` },
        ],
        autoBubble: `${config.clubName}临时任务对象`,
      },
    },
    {
      ...config.assistant,
      dialogue: {
        dialogues: [
          { text: `我是${config.clubName}日常任务协助员，负责训练、器材和值班打卡。任务要求打卡时，请到指定地点附近再完成。` },
        ],
        autoBubble: `${config.clubName}日常任务协助`,
      },
    },
    {
      ...config.eventLead,
      dialogue: {
        dialogues: [
          { text: `我是${config.clubName}特殊活动负责人，演出、比赛、招新和告别类任务会由我现场确认。` },
        ],
        autoBubble: `${config.clubName}活动任务现场`,
      },
    },
  ]);
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || '127.0.0.1',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
    charset: 'utf8mb4',
  });

  await connection.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await connection.query(`USE \`${DB_NAME}\``);
  await connection.query('SET FOREIGN_KEY_CHECKS = 0');
  await connection.query(`DROP TABLE IF EXISTS ${DROP_TABLES.map(name => `\`${name}\``).join(', ')}`);
  await connection.query('SET FOREIGN_KEY_CHECKS = 1');

  for (const file of FILES) {
    const filePath = path.join(ROOT, file);
    const sql = await fs.readFile(filePath, 'utf8');
    console.log(`导入 ${file}`);
    await connection.query(sql);
  }

  await connection.query(
    `INSERT INTO club_tasks (club_id, task_name, description, task_type, difficulty, reward, grade_limit)
     VALUES ?`,
    [EXTRA_DAILY_TASKS.map(([clubId, name, description, type, difficulty, reward, grade]) => [
      clubId,
      name,
      description,
      type,
      difficulty,
      JSON.stringify(reward),
      grade,
    ])]
  );

  await enrichClubTasks(connection);

  await connection.query(
    `INSERT INTO npcs (npc_id, npc_name, npc_type, map_id, x_coordinate, y_coordinate, dialogue, npc_function)
     VALUES ?`,
    [TASK_PUBLISHER_NPCS.map(([npcId, npcName, npcType, mapId, x, y, clubId, clubName]) => [
      npcId,
      npcName,
      npcType,
      mapId,
      x,
      y,
      JSON.stringify({
        dialogues: [
          { text: `我是${clubName}任务委员，本月可发布的任务会根据你的等级和世界时间变化。` },
          {
            options: [
              { text: '领取社团任务', action: 'issue_club_tasks', clubId },
              { text: `加入${clubName}`, action: 'join_club', clubId },
              { text: '离开', action: 'close' },
            ],
          },
        ],
        autoBubble: `${clubName}任务发布中`,
      }),
      'task_publisher',
    ])]
  );

  const taskContactNpcs = buildTaskContactNpcs();
  await connection.query(
    `INSERT INTO npcs (npc_id, npc_name, npc_type, map_id, x_coordinate, y_coordinate, dialogue, npc_function)
     VALUES ?`,
    [taskContactNpcs.map(npc => [
      npc.id,
      npc.name,
      npc.type,
      npc.mapId,
      npc.x,
      npc.y,
      JSON.stringify(npc.dialogue),
      'club_task_contact',
    ])]
  );

  await connection.end();
  console.log(`数据库 ${DB_NAME} 初始化完成`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
