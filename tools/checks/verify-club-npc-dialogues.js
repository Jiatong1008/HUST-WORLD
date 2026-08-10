const mysql = require('mysql2/promise');
require('dotenv').config();

async function verifyClubNpcDialogues() {
  try {
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || '123456',
      database: process.env.DB_NAME || 'hust_world'
    });

    console.log('🔍 验证社团负责人NPC对话数据...\n');

    // 查询四个社团负责人NPC
    const [npcs] = await connection.execute(
      'SELECT npc_id, npc_name, npc_type, map_id, dialogue FROM npcs WHERE npc_id IN (328, 329, 330, 331) ORDER BY npc_id'
    );

    for (const npc of npcs) {
      console.log(`📋 ${npc.npc_name} (NPC ID: ${npc.npc_id})`);
      console.log(`   类型: ${npc.npc_type}, 地图ID: ${npc.map_id}`);
      
      if (npc.dialogue) {
        try {
          const dialogue = typeof npc.dialogue === 'string' ? JSON.parse(npc.dialogue) : npc.dialogue;
          
          if (dialogue.autoBubble) {
            console.log(`   自动气泡: ${dialogue.autoBubble}`);
          }
          
          if (dialogue.dialogues && dialogue.dialogues.length > 0) {
            console.log(`   对话步骤: ${dialogue.dialogues.length} 步`);
            
            dialogue.dialogues.forEach((step, idx) => {
              if (step.text) {
                console.log(`   [${idx + 1}] 文本: "${step.text.substring(0, 50)}${step.text.length > 50 ? '...' : ''}"`);
              }
              if (step.options) {
                const optionsText = Array.isArray(step.options) 
                  ? step.options.map(opt => typeof opt === 'string' ? opt : opt.text).join(', ')
                  : JSON.stringify(step.options);
                console.log(`   [${idx + 1}] 选项: ${optionsText}`);
                
                // 检查是否有action
                if (Array.isArray(step.options)) {
                  step.options.forEach(opt => {
                    if (typeof opt === 'object' && opt.action) {
                      console.log(`         -> 动作: ${opt.action}${opt.clubId ? ` (Club ID: ${opt.clubId})` : ''}`);
                    }
                  });
                }
              }
              if (step.action) {
                console.log(`   [${idx + 1}] 动作: ${step.action}${step.clubId ? ` (Club ID: ${step.clubId})` : ''}`);
              }
            });
          }
        } catch (e) {
          console.log(`   ⚠️ 对话数据解析失败: ${e.message}`);
          console.log(`   原始数据: ${npc.dialogue}`);
        }
      } else {
        console.log(`   ⚠️ 没有对话数据`);
      }
      console.log('');
    }

    console.log('✅ 验证完成！');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  }
}

verifyClubNpcDialogues();
