/**
 * 对话配置模块
 *
 * 新增字段说明：
 * - options 中的 affinityChange：选择该对话选项后，与该 NPC 的关系值变化量（可为正/负）。
 *   非零时会调用 QuestTriggerManager.adjustNpcRelation 并显示关系变化 Toast。
 */

function createNode(id, speaker, text, options = [], isEnd = false) {
  return { id, speaker, text, options, isEnd };
}

function endOption(text = '结束对话') {
  return { text, next: 'end' };
}

function contOption(text = '继续', next = 'start') {
  return { text, next };
}

const NPC_DIALOGUES = {
  npc_volunteer_freshman: {
    id: 'npc_volunteer_freshman',
    npcId: 'volunteer_freshman',
    nodes: [
      createNode('start', '迎新志愿者', '欢迎来到华中大！咱们学校外号“森林大学”，树比楼多，校车比出租车还挤。我可以带你完成报到，也可以先给你指指路。', [
        { text: '领取新生报到任务', next: 'accept', conditions: { questStatus: { volunteer_freshman: 'AVAILABLE' } }, effects: { acceptQuest: 'freshman_arrival' }, affinityChange: 3 },
        { text: '继续办理报到', next: 'report', conditions: { questStatus: { volunteer_freshman: 'ACTIVE' } }, effects: { progressQuest: 'freshman_arrival' } },
        { text: '完成报到交付', next: 'deliver', conditions: { questStatus: { volunteer_freshman: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'freshman_arrival' }, affinityChange: 5 },
        { text: '先熟悉一下校园', next: 'explore', conditions: { questStatus: { volunteer_freshman: 'AVAILABLE' } }, effects: { unlockQuest: 'explore_first' } },
        { text: '聊聊校园生活', next: 'default_completed', conditions: { questStatus: { volunteer_freshman: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('accept', '迎新志愿者', '先去南大门完成报到，回来时记得找我确认。军训前最好把校园卡办好，不然买热干面都刷不了。', [endOption('我这就去')]),
      createNode('report', '迎新志愿者', '看来你已经在办理了。去南大门把信息确认完，再回来找我。', [endOption('谢谢提醒')]),
      createNode('deliver', '迎新志愿者', '报到完成！下一站去操场参加军训，华科早操和军训都很硬核，做好被“四大名补”支配的心理准备。', [endOption('明白')]),
      createNode('explore', '迎新志愿者', '从南大门沿主路走，图书馆、教学楼、青年园都在中轴线上。记住：早八别从东九一楼换到五楼，跑断腿。', [endOption('记住了')]),
      createNode('default_completed', '迎新志愿者', '你现在已经很像华科人了。以后找不到路，也可以回来问我。', [endOption('回头见')]),
      createNode('end', '迎新志愿者', '找不到路的话，随时回来问我。', [], true)
    ]
  },
  npc_drill_instructor: {
    id: 'npc_drill_instructor',
    npcId: 'drill_instructor',
    nodes: [
      createNode('start', '军训教官', '站直了！军训是大学第一课，也是华科“森林大学”户外体验项目。准备好接受训练了吗？', [
        { text: '接受军训任务', next: 'accept', conditions: { questStatus: { drill_instructor: 'AVAILABLE' }, questCompleted: 'freshman_arrival' }, effects: { acceptQuest: 'military_training' }, affinityChange: 3 },
        { text: '汇报训练进度', next: 'progress', conditions: { questStatus: { drill_instructor: 'ACTIVE' } }, effects: { progressQuest: 'military_training' } },
        { text: '完成军训', next: 'done', conditions: { questStatus: { drill_instructor: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'military_training' }, affinityChange: 8 },
        { text: '先完成报到再来', next: 'end', conditions: { questNotCompleted: 'freshman_arrival' } },
        { text: '教官再见', next: 'end', conditions: { questStatus: { drill_instructor: 'COMPLETED' } } }
      ]),
      createNode('accept', '军训教官', '纪律第一！完成今天的训练队列，再回来报告。', [endOption('是，教官')]),
      createNode('progress', '军训教官', '保持队形，注意节奏。华科的太阳不惯着谁。', [endOption('继续训练')]),
      createNode('done', '军训教官', '不错。回宿舍休息，准备迎接第一堂高数课。', [endOption('教官辛苦了')]),
      createNode('end', '军训教官', '先把报到流程走完。', [], true)
    ]
  },
  npc_math_teacher: {
    id: 'npc_math_teacher',
    npcId: 'math_teacher',
    nodes: [
      createNode('start', '高数老师', '数学是华科的必修课，也是“四大名补”之首。想拿高分，要么天赋异禀，要么图书馆占座够早。', [
        { text: '开始高数入门课', next: 'accept', conditions: { questStatus: { math_teacher: 'AVAILABLE' } }, effects: { acceptQuest: 'math_intro' }, affinityChange: 3 },
        { text: '上课听讲', next: 'class', conditions: { questStatus: { math_teacher: 'ACTIVE' } }, effects: { progressQuest: 'math_intro', stats: { knowledge: 5 } }, affinityChange: 5 },
        { text: '交作业', next: 'deliver', conditions: { questStatus: { math_teacher: 'READY_TO_COMPLETE' }, hasItem: 'homework' }, effects: { deliverQuest: 'math_intro', removeItem: 'homework' }, affinityChange: 5 },
        { text: '挑战期末考试', next: 'exam', conditions: { questStatus: { math_teacher: 'COMPLETED' } }, effects: { completeQuest: 'math_final_exam' }, affinityChange: 5 },
        { text: '复习重点', next: 'review', conditions: { questStatus: { math_teacher: 'ACTIVE' } }, effects: { startObjective: { questId: 'math_intro', objectiveId: 'review_notes' } }, affinityChange: 3 }
      ]),
      createNode('accept', '高数老师', '上课、写作业、泡图书馆，一个都不能少。华科的“学在华科”不是白叫的。', [endOption('明白')]),
      createNode('class', '高数老师', '课后去图书馆刷题，比考前突击管用十倍。', [endOption('记下了')]),
      createNode('deliver', '高数老师', '作业收到。保持这个节奏，期末不会太惨。', [endOption('谢谢老师')]),
      createNode('exam', '高数老师', '考试结束。记住：华科的挂科率不是用来吓人的，是用来提醒你的。', [endOption('我会努力的')]),
      createNode('review', '高数老师', '好笔记是考试周的救命稻草。', [endOption('我去整理笔记')]),
      createNode('end', '高数老师', '下节课见。', [], true)
    ]
  },
  npc_librarian: {
    id: 'npc_librarian',
    npcId: 'librarian',
    nodes: [
      createNode('start', '图书馆管理员', '主图书馆是华科“学在华科”的精神图腾。期末周座位紧张，建议早上七点前到，否则只能看到一排占座书。', [
        { text: '接受图书馆探索任务', next: 'accept', conditions: { questStatus: { librarian: 'AVAILABLE' } }, effects: { acceptQuest: 'explore_library_corner' }, affinityChange: 3 },
        { text: '在此自习', next: 'study', conditions: { questStatus: { librarian: 'ACTIVE' } }, effects: { progressQuest: 'explore_library_corner', stats: { knowledge: 5, mood: 2 } }, affinityChange: 2 },
        { text: '找到安静角落', next: 'deliver', conditions: { questStatus: { librarian: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'explore_library_corner' }, affinityChange: 5 },
        { text: '再来自习', next: 'completed', conditions: { questStatus: { librarian: 'COMPLETED' } }, affinityChange: 2 },
        { text: '悄悄离开', next: 'end' }
      ]),
      createNode('accept', '图书馆管理员', '选个楼层，保持安静，记得把占座书带走。知识靠积累，不靠占位。', [endOption('好的')]),
      createNode('study', '图书馆管理员', '保持节奏。图书馆的WiFi和咖啡，是期末周唯二的依靠。', [endOption('继续学习')]),
      createNode('deliver', '图书馆管理员', '三楼靠窗的座位视野不错，但早上六点就有人放书了。', [endOption('我明天早起')]),
      createNode('completed', '图书馆管理员', '欢迎回来。自习室永远为你亮灯。', [endOption('谢谢')]),
      createNode('end', '图书馆管理员', '请保持安静。', [], true)
    ]
  },
  npc_club_leader: {
    id: 'npc_club_leader',
    npcId: 'club_leader',
    nodes: [
      createNode('start', '社团负责人', '华科社团多如牛毛，百团大战那天东操草坪人山人海。想加入社团、参加光马志愿或者搞项目吗？', [
        { text: '加入社团', next: 'join', conditions: { questStatus: { club_leader: 'AVAILABLE' } }, effects: { acceptQuest: 'club_join', clubAction: 'join' }, affinityChange: 8 },
        { text: '参加社团活动', next: 'activity', conditions: { questStatus: { club_leader: 'ACTIVE' } }, effects: { progressQuest: 'club_first_activity' }, affinityChange: 5 },
        { text: '完成活动报告', next: 'deliver', conditions: { questStatus: { club_leader: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'club_first_activity' }, affinityChange: 5 },
        { text: '查看社团项目', next: 'completed', conditions: { questStatus: { club_leader: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('join', '社团负责人', '欢迎！华科社团从机器人到汉服，从光马到辩论社，总有一款适合你。先参加一次破冰活动吧。', [endOption('好')]),
      createNode('activity', '社团负责人', '今天破冰活动气氛不错。下次可以试试光马志愿者，体验一把华科体育盛事。', [endOption('记住了')]),
      createNode('deliver', '社团负责人', '活动已记录。继续参与，大三还能竞选骨干。', [endOption('没问题')]),
      createNode('completed', '社团负责人', '活动中心随时欢迎你。要不要接个小项目练练手？', [endOption('下次吧')]),
      createNode('end', '社团负责人', '活动中心随时欢迎你。', [], true)
    ]
  },
  npc_running_coach: {
    id: 'npc_running_coach',
    npcId: 'running_coach',
    nodes: [
      createNode('start', '跑步教练', '华科操场晚上永远不缺跑步的人。体测、光马、夜跑，选一个开始？', [
        { text: '开始操场初跑', next: 'accept', conditions: { questStatus: { running_coach: 'AVAILABLE' } }, effects: { acceptQuest: 'run_first' }, affinityChange: 3 },
        { text: '开始跑步', next: 'run', conditions: { questStatus: { running_coach: 'ACTIVE' } }, effects: { progressQuest: 'run_first', stats: { stamina: 5, mood: 3 } }, affinityChange: 5 },
        { text: '参加体测挑战', next: 'test', conditions: { questStatus: { running_coach: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'run_fitness_test' }, affinityChange: 8 },
        { text: '请教跑步技巧', next: 'completed', conditions: { questStatus: { running_coach: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('accept', '跑步教练', '先跑一圈，感受一下华科夜跑的氛围。坚持下来，体测不用慌。', [endOption('开跑')]),
      createNode('run', '跑步教练', '节奏不错。比挤校车轻松吧？', [endOption('确实')]),
      createNode('test', '跑步教练', '体测完成。训练不会骗你，成绩也不会。', [endOption('谢谢教练')]),
      createNode('completed', '跑步教练', ' consistency beats intensity。华科操场见。', [endOption('操场见')]),
      createNode('end', '跑步教练', '操场见。', [], true)
    ]
  },
  npc_canteen_auntie: {
    id: 'npc_canteen_auntie',
    npcId: 'canteen_auntie',
    nodes: [
      createNode('start', '食堂阿姨', '同学，吃什么？华科食堂三十多个，东园热干面、百景园麻辣香锅、西一自选菜，个个都有粉丝。', [
        { text: '解锁隐藏菜单', next: 'secret', conditions: { questStatus: { canteen_auntie: 'AVAILABLE' } }, effects: { acceptQuest: 'explore_canteen_secret' }, affinityChange: 5 },
        { text: '点隐藏套餐', next: 'deliver', conditions: { questStatus: { canteen_auntie: 'READY_TO_COMPLETE' }, hasItem: 'campus_food_coupon' }, effects: { deliverQuest: 'explore_canteen_secret', removeItem: 'campus_food_coupon' }, affinityChange: 5 },
        { text: '打开食堂商店', next: 'shop', effects: { shopOpen: 'canteen' } },
        { text: '随便聊聊', next: 'completed', conditions: { questStatus: { canteen_auntie: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('secret', '食堂阿姨', '这个隐藏套餐不写在菜单上，老华科人才知道。吃完记得去图书馆占座。', [endOption('来一份')]),
      createNode('deliver', '食堂阿姨', '给你，趁热吃。在华科，吃饱才有力气学。', [endOption('谢谢阿姨')]),
      createNode('shop', '食堂阿姨', '想吃什么自己点，校园卡余额够吗？', [endOption('看看')]),
      createNode('completed', '食堂阿姨', '吃饱再去学，别饿着刷夜。', [endOption('好嘞')]),
      createNode('end', '食堂阿姨', '吃饱再学习。', [], true)
    ]
  },
  npc_lab_mentor: {
    id: 'npc_lab_mentor',
    npcId: 'lab_mentor',
    nodes: [
      createNode('start', '实验室导师', '华科的实验室晚上十一点还亮着灯。科研从好奇开始，从记录结束。', [
        { text: '接受实验室参观任务', next: 'accept', conditions: { questStatus: { lab_mentor: 'AVAILABLE' } }, effects: { acceptQuest: 'explore_lab', stats: { knowledge: 6 } }, affinityChange: 5 },
        { text: '参观实验室', next: 'lab', conditions: { questStatus: { lab_mentor: 'ACTIVE' } }, effects: { progressQuest: 'explore_lab' }, affinityChange: 3 },
        { text: '提交实验报告', next: 'deliver', conditions: { questStatus: { lab_mentor: 'READY_TO_COMPLETE' }, hasItem: 'lab_report' }, effects: { deliverQuest: 'explore_lab', removeItem: 'lab_report' }, affinityChange: 8 },
        { text: '请教毕业设计', next: 'thesis', conditions: { questStatus: { lab_mentor: 'COMPLETED' } }, effects: { unlockQuest: 'thesis_preparation' }, affinityChange: 3 },
        { text: '离开', next: 'end' }
      ]),
      createNode('accept', '实验室导师', '先去参观，认真观察，然后写一份简短报告。', [endOption('好的')]),
      createNode('lab', '实验室导师', '观察优先，再参与小实验。数据要记在本子上。', [endOption('记下了')]),
      createNode('deliver', '实验室导师', '报告收到。你越来越有科研的样子了。', [endOption('谢谢导师')]),
      createNode('thesis', '实验室导师', '做毕设的时候，范围小一点、完整一点，比大而空好。', [endOption('明白')]),
      createNode('end', '实验室导师', '保持好奇心。', [], true)
    ]
  },
  npc_internship_senior: {
    id: 'npc_internship_senior',
    npcId: 'internship_senior',
    nodes: [
      createNode('start', '实习学长', '大三开始实习，华科学生的简历上不能只有绩点。项目和沟通一样重要。', [
        { text: '请教实习准备', next: 'advice', conditions: { questStatus: { internship_senior: 'AVAILABLE' } }, effects: { acceptQuest: 'internship_prep' }, affinityChange: 6 },
        { text: '更新实习进度', next: 'progress', conditions: { questStatus: { internship_senior: 'ACTIVE' } }, effects: { progressQuest: 'internship_prep' }, affinityChange: 3 },
        { text: '提交简历', next: 'deliver', conditions: { questStatus: { internship_senior: 'READY_TO_COMPLETE' }, hasItem: 'resume' }, effects: { deliverQuest: 'internship', removeItem: 'resume' }, affinityChange: 8 },
        { text: '说声谢谢', next: 'completed', conditions: { questStatus: { internship_senior: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('advice', '实习学长', '面试时把项目讲清楚：你做了什么、为什么做、结果如何。比堆砌术语强。', [endOption('受教了')]),
      createNode('progress', '实习学长', '继续打磨项目和简历，别等到秋招才开始。', [endOption('继续')]),
      createNode('deliver', '实习学长', '简历不错，祝你拿到好offer。', [endOption('谢谢学长')]),
      createNode('completed', '实习学长', '下次带简历来，我帮你再看看。', [endOption('好')]),
      createNode('end', '实习学长', '记得准备简历。', [], true)
    ]
  },
  npc_thesis_supervisor: {
    id: 'npc_thesis_supervisor',
    npcId: 'thesis_supervisor',
    nodes: [
      createNode('start', '毕设导师', '毕设是四年学习的收官之作。在华科，做毕设要小而精，不要大而空。', [
        { text: '讨论选题', next: 'topic', conditions: { questStatus: { thesis_supervisor: 'AVAILABLE' } }, effects: { acceptQuest: 'thesis_preparation' }, affinityChange: 8 },
        { text: '汇报进度', next: 'progress', conditions: { questStatus: { thesis_supervisor: 'ACTIVE' } }, effects: { progressQuest: 'thesis_preparation' }, affinityChange: 5 },
        { text: '提交初稿', next: 'deliver', conditions: { questStatus: { thesis_supervisor: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'thesis_writing' }, affinityChange: 5 },
        { text: '准备答辩', next: 'completed', conditions: { questStatus: { thesis_supervisor: 'COMPLETED' } }, effects: { unlockQuest: 'thesis_defense' }, affinityChange: 3 },
        { text: '离开', next: 'end' }
      ]),
      createNode('topic', '毕设导师', '选题要小，完成度要高。华科答辩老师可不吃“概念流”。', [endOption('明白')]),
      createNode('progress', '毕设导师', '按计划推进，别拖到最后一周。', [endOption('我会的')]),
      createNode('deliver', '毕设导师', '结构清晰多了。准备答辩PPT，讲清楚贡献。', [endOption('好的')]),
      createNode('completed', '毕设导师', '答辩是最后一关。练习三分钟讲清楚你的工作。', [endOption('我去准备')]),
      createNode('end', '毕设导师', '按计划推进。', [], true)
    ]
  },
  npc_defense_teacher: {
    id: 'npc_defense_teacher',
    npcId: 'defense_teacher',
    nodes: [
      createNode('start', '答辩老师', '用三分钟讲清楚你的目标、方法和验证。华科答辩不看你吹得多响，看你做得多实。', [
        { text: '开始答辩', next: 'defense', conditions: { questStatus: { defense_teacher: 'AVAILABLE' } }, effects: { acceptQuest: 'thesis_defense' }, affinityChange: 6 },
        { text: '进行答辩', next: 'defending', conditions: { questStatus: { defense_teacher: 'ACTIVE' } }, effects: { progressQuest: 'thesis_defense' }, affinityChange: 5 },
        { text: '听取结果', next: 'deliver', conditions: { questStatus: { defense_teacher: 'READY_TO_COMPLETE' } }, effects: { deliverQuest: 'thesis_defense' }, affinityChange: 6 },
        { text: '参加毕业典礼', next: 'graduation', conditions: { questStatus: { defense_teacher: 'COMPLETED' } }, effects: { completeQuest: 'graduation' }, affinityChange: 10 },
        { text: '离开', next: 'end' }
      ]),
      createNode('defense', '答辩老师', '逻辑清晰，证据充分。答辩通过。', [endOption('谢谢老师')]),
      createNode('defending', '答辩老师', '回答问题时冷静，坚持你的数据。', [endOption('我会的')]),
      createNode('deliver', '答辩老师', '恭喜。还差一场毕业典礼，你的华科四年就圆满了。', [endOption('期待')]),
      createNode('graduation', '答辩老师', '毕业快乐。愿你在未来的路上继续做出有价值的东西。', [endOption('谢谢华科')]),
      createNode('end', '答辩老师', '充分准备后再来。', [], true)
    ]
  },
  npc_shopkeeper: {
    id: 'npc_shopkeeper',
    npcId: 'shopkeeper',
    nodes: [
      createNode('start', '校园超市老板', '小店不大，但能救考试周。笔记本、咖啡、运动饮料，还有校园卡补办券，要啥？', [
        { text: '接受购物任务', next: 'accept', conditions: { questStatus: { shopkeeper: 'AVAILABLE' } }, effects: { acceptQuest: 'buy_stationery' }, affinityChange: 3 },
        { text: '买笔记本', next: 'buy', conditions: { questStatus: { shopkeeper: 'ACTIVE' }, moneyMin: 10 }, effects: { progressQuest: 'buy_stationery', money: -10, addItem: 'notebook' } },
        { text: '交付收据', next: 'deliver', conditions: { questStatus: { shopkeeper: 'READY_TO_COMPLETE' }, hasItem: 'receipt' }, effects: { deliverQuest: 'buy_stationery', removeItem: 'receipt' }, affinityChange: 5 },
        { text: '打开商店', next: 'shop', effects: { shopOpen: 'campus_shop' } },
        { text: '闲聊', next: 'completed', conditions: { questStatus: { shopkeeper: 'COMPLETED' } }, affinityChange: 2 },
        { text: '离开', next: 'end' }
      ]),
      createNode('accept', '校园超市老板', '买本笔记本，把收据给我带回来。', [endOption('好')]),
      createNode('buy', '校园超市老板', '好本子抵得上半本复习笔记。', [endOption('谢谢老板')]),
      createNode('deliver', '校园超市老板', '收据确认。保持这个习惯，学习不差这一本。', [endOption('明白')]),
      createNode('shop', '校园超市老板', '随便看，校园卡余额够就行。', [endOption('看看')]),
      createNode('completed', '校园超市老板', '常来啊。', [endOption('再见')]),
      createNode('end', '校园超市老板', '常来啊。', [], true)
    ]
  }
};

const LEGACY_DIALOGUES = {
  freshman_arrival: [{ speaker: '迎新志愿者', text: '报到完成。下一站去操场参加军训。' }],
  military_training: [{ speaker: '军训教官', text: '军训完成。回宿舍休息，准备上课。' }],
  math_intro: [{ speaker: '高数老师', text: '高数第一课完成。记得去图书馆刷题。' }],
  math_final_exam: [{ speaker: '高数老师', text: '期末考试完成。' }],
  graduation: [{ speaker: '答辩老师', text: '毕业典礼完成。毕业快乐！' }],
  club_join: [{ speaker: '社团负责人', text: '社团加入成功。' }],
  run_first: [{ speaker: '跑步教练', text: '第一次夜跑完成。' }],
  explore_first: [{ speaker: '迎新志愿者', text: '第一次校园探索完成。' }],
  explore_library_corner: [{ speaker: '图书馆管理员', text: '找到了安静的自习角落。' }],
  explore_canteen_secret: [{ speaker: '食堂阿姨', text: '隐藏菜单解锁。' }],
  explore_lab: [{ speaker: '实验室导师', text: '实验室参观完成。' }]
};

export const DIALOGUE_CONFIG = {
  ...NPC_DIALOGUES,
  ...LEGACY_DIALOGUES
};

export const DIALOGUE_NPC_MAP = {
  freshman_arrival: 'volunteer_freshman',
  military_training: 'drill_instructor',
  math_intro: 'math_teacher',
  math_final_exam: 'math_teacher',
  explore_library_corner: 'librarian',
  club_join: 'club_leader',
  run_first: 'running_coach',
  run_fitness_test: 'running_coach',
  explore_first: 'volunteer_freshman',
  explore_canteen_secret: 'canteen_auntie',
  explore_lab: 'lab_mentor',
  internship_prep: 'internship_senior',
  internship: 'internship_senior',
  thesis_preparation: 'thesis_supervisor',
  thesis_writing: 'thesis_supervisor',
  thesis_defense: 'defense_teacher',
  graduation: 'defense_teacher',
  club_first_activity: 'club_leader',
  buy_stationery: 'shopkeeper'
};

export function legacyToNodes(lines) {
  return lines.map((line, index) => ({
    id: `node_${index}`,
    text: line.text,
    speaker: line.speaker || 'System',
    isEnd: index === lines.length - 1,
    options: index === lines.length - 1 ? [] : [{ text: '继续', next: `node_${index + 1}` }]
  }));
}

export function getDialogueById(dialogueId) {
  const dialogue = DIALOGUE_CONFIG[dialogueId];
  if (!dialogue) return null;
  if (Array.isArray(dialogue)) return { id: dialogueId, nodes: legacyToNodes(dialogue) };
  return dialogue;
}

export function getDialogueByNpcId(npcId) {
  return Object.values(NPC_DIALOGUES).find(dialogue => dialogue.npcId === npcId) || null;
}

export function getDialogueByQuestId(questId) {
  const npcId = DIALOGUE_NPC_MAP[questId];
  return npcId ? getDialogueByNpcId(npcId) : getDialogueById(questId);
}

export function getDialogueForQuest(questId) {
  return questId ? getDialogueByQuestId(questId) : null;
}

export default DIALOGUE_CONFIG;
