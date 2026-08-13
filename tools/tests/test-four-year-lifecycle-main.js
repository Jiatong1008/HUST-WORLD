import { QuestTriggerManager } from '/game/js/managers/QuestTriggerManager.js';
import { SEMESTER_PHASES } from '/game/js/config/QuestTriggerConfig.js';

const results = [];
const log = document.getElementById('test-log');
const minutesPerSemester = 20 * 7 * 24 * 60;

function assert(condition, message) {
  results.push({ ok: !!condition, message });
  const line = document.createElement('div');
  line.textContent = `${condition ? 'PASS' : 'FAIL'} ${message}`;
  log.appendChild(line);
}

async function run() {
  const time = window.timeSystem;
  time.pause();
  time.showToast = () => {};
  time.updateUI = () => {};
  time.saveTime = () => {};
  time.checkTimePeriodChange = () => {};
  time.gameTime = { year: 1, semester: 1, week: 1, day: 1, hour: 0, minute: 0 };

  const semesterChanges = [];
  const semesterEnds = [];
  time.subscribe('semesterChange', (_, data) => semesterChanges.push({ ...data }));
  time.subscribe('semesterEnd', (_, data) => semesterEnds.push({ ...data }));

  for (let semesterIndex = 0; semesterIndex < 8; semesterIndex++) {
    time.advanceTimeByMinutes(minutesPerSemester);
    const expected = semesterIndex === 7
      ? { year: 5, semester: 1, week: 1 }
      : SEMESTER_PHASES[semesterIndex + 1];
    assert(
      time.gameTime.year === expected.year && time.gameTime.semester === expected.semester && time.gameTime.week === 1,
      `第 ${semesterIndex + 1} 个学期结束后正确进入 ${expected.year} 学年 ${expected.semester} 学期`
    );
  }
  assert(semesterChanges.length === 8 && semesterEnds.length === 8, '八次学期交替均发出开始/结束事件');
  assert(semesterEnds[0]?.year === 1 && semesterEnds[7]?.year === 4, '学期事件中的学年保持 1–4 的游戏内编号');

  const manager = new QuestTriggerManager();
  manager.autoExamMode = true;
  manager.autoWinExam = true;
  manager.init({
    characterName: '四年流程测试',
    college: '计算机科学与技术学院',
    gender: 'male',
    level: 8,
    experience: 0,
    money: 1000,
    stamina: 100,
    maxStamina: 100,
    knowledge: 80,
    social: 70,
    mood: 70,
    grade: 1,
    semester: 1,
    week: 1
  });

  const mainRoute = [
    'freshman_arrival', 'military_training', 'math_intro', 'math_final_exam',
    'club_join', 'run_first', 'explore_lab', 'internship',
    'thesis_preparation', 'thesis_defense', 'graduation'
  ];
  for (const questId of mainRoute) {
    const outcome = await manager.completeQuest(questId, { force: true, auto: true });
    assert(outcome.success, `主线任务「${questId}」可完成`);
  }

  assert(manager.currentPhaseIndex === SEMESTER_PHASES.length - 1, '主线流程正确停在大四下学期');
  assert(manager.gameTime.year === 4 && manager.gameTime.semester === 2, '阶段推进使用第 4 学年而非现实年份');
  assert(manager.completedQuests.has('graduation'), '毕业典礼已写入主线进度');
  assert(manager.achievements.has('hust_graduate'), '毕业成就已解锁');
  assert(manager.ending?.title && manager.ending?.description, '毕业结局已生成');
}

run().catch(error => assert(false, `测试运行异常：${error.message}`)).finally(() => {
  window.__testResults = { passed: results.every(result => result.ok), results };
});
