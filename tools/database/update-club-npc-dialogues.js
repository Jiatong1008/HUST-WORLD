const mysql = require('mysql2/promise');
require('dotenv').config();

// 四个社团负责人的对话数据
const clubNpcDialogues = [
  {
    npcId: 328,
    clubId: 1,
    clubName: '蓝桥编程社',
    npcName: '编程社社长',
    dialogue: {
      dialogues: [
        { text: "你好！我是蓝桥编程社的社长。欢迎来到计算机学院！" },
        { text: "我们社团专注于编程竞赛、项目开发，一起学习算法、刷题提升。" },
        { options: ["加入编程社", "查看社团任务", "离开"] }
      ],
      autoBubble: "💻 编程社招新中！"
    }
  },
  {
    npcId: 329,
    clubId: 2,
    clubName: '光影跑酷社',
    npcName: '跑酷社社长',
    dialogue: {
      dialogues: [
        { text: "嘿！我是光影跑酷社社长！来西操场运动吧！" },
        { text: "我们社团有跑酷小游戏、校园跑酷挑战，热爱运动就来加入！" },
        { options: ["加入跑酷社", "查看社团任务", "离开"] }
      ],
      autoBubble: "🏃 跑酷社招新中！"
    }
  },
  {
    npcId: 330,
    clubId: 3,
    clubName: '喻园摄影协会',
    npcName: '摄影协会会长',
    dialogue: {
      dialogues: [
        { text: "你好！我是喻园摄影协会会长！图书馆的风景很美吧？" },
        { text: "我们社团一起记录校园美好，有拍照打卡、摄影展活动！" },
        { options: ["加入摄影协会", "查看社团任务", "离开"] }
      ],
      autoBubble: "📷 摄影协会招新中！"
    }
  },
  {
    npcId: 331,
    clubId: 4,
    clubName: '百景志愿队',
    npcName: '志愿队队长',
    dialogue: {
      dialogues: [
        { text: "欢迎来到百景志愿队！我是队长！" },
        { text: "我们社团组织校园志愿服务，贡献爱心，提升社交能力！" },
        { options: ["加入志愿队", "查看社团任务", "离开"] }
      ],
      autoBubble: "🤝 志愿队招新中！"
    }
  }
];

// 根据选择添加选项处理
// 我们需要根据选择添加后续的对话步骤
const enhancedDialogues = clubNpcDialogues.map(npc => {
  const dialogues = [...npc.dialogue.dialogues];
  
  // 第三步是选择选项，我们需要添加后续的分支
  // 这里我们简化处理，直接在选项中添加action，或者添加更多对话
  // 让我们修改选项部分，添加action
  dialogues[2] = {
    options: [
      { text: "加入" + npc.clubName, action: "join_club", clubId: npc.clubId },
      { text: "查看社团任务", action: "issue_club_tasks", clubId: npc.clubId },
      { text: "离开" }
    ]
  };
  
  // 添加加入成功的回复
  dialogues.push({
    text: `太棒了！欢迎加入${npc.clubName}！希望你在这里能收获成长和友谊！`,
    action: "join_club",
    clubId: npc.clubId
  });
  
  return {
    ...npc,
    dialogue: {
      ...npc.dialogue,
      dialogues
    }
  };
});

async function updateClubNpcDialogues() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('🔄 开始更新社团负责人NPC对话数据...\n');

    for (const npc of enhancedDialogues) {
      const dialogueJson = JSON.stringify(npc.dialogue);
      
      await connection.execute(
        'UPDATE npcs SET dialogue = ? WHERE npc_id = ?',
        [dialogueJson, npc.npcId]
      );
      
      console.log(`✅ 已更新 ${npc.npcName} (${npc.clubName}) 的对话数据`);
      console.log(`   NPC ID: ${npc.npcId}, Club ID: ${npc.clubId}`);
      console.log('');
    }

    console.log('🎉 社团负责人NPC对话数据更新完成！');
    console.log('\n📋 对话功能说明:');
    console.log('  1. 玩家可以与社团负责人NPC对话');
    console.log('  2. 选择"加入XX社"可以加入对应社团');
    console.log('  3. 选择"查看社团任务"可以打开社团任务界面');
    console.log('  4. 选择"离开"可以关闭对话');

    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 更新失败:', error);
    process.exit(1);
  }
}

updateClubNpcDialogues();
