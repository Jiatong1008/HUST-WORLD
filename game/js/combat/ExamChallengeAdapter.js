/**
 * ExamChallengeAdapter.js
 * 最小考试/战斗闭环：将 EXAM 类型任务包装为可复用的挑战逻辑。
 * 复用项目已有的属性系统（knowledge、proficiency、mood、stamina），
 * 在没有独立 CombatSystem/BattleManager 的情况下提供兜底实现。
 */

const ExamChallengeAdapter = {
  // 是否启用战斗式 UI（真实浏览器弹出题目）
  useBattleUI: true,

  // 题库：按科目分类
  questionBank: {
    '高等数学': [
      {
        question: '函数 y = x² 在 x = 1 处的导数是多少？',
        options: ['0', '1', '2', '3'],
        correct: 2
      },
      {
        question: '积分 ∫ 2x dx 等于（忽略常数 C）？',
        options: ['x²', '2x²', 'x', '2'],
        correct: 0
      },
      {
        question: '当 x → 0 时，sin(x) / x 的极限是？',
        options: ['0', '1', '∞', '不存在'],
        correct: 1
      },
      {
        question: '函数 f(x) = e^x 的导数是它本身，对吗？',
        options: ['对', '错'],
        correct: 0
      }
    ]
  },

  /**
   * 计算考试成功概率（基于知识属性与科目熟练度）
   * @param {Object} characterStats - 角色属性
   * @param {Object} proficiency - 科目熟练度对象
   * @param {string} subject - 科目名称
   * @param {number} difficulty - 难度系数 1-5
   */
  calculateSuccessRate(characterStats = {}, proficiency = {}, subject = '高等数学', difficulty = 1) {
    const knowledge = characterStats.knowledge || 0;
    const subjectProf = proficiency[subject] || 0;
    const base = 0.3;
    const knowledgeBonus = Math.min(knowledge / 200, 0.3);
    const profBonus = Math.min(subjectProf / 100, 0.35);
    const difficultyPenalty = (difficulty - 1) * 0.08;
    let skillBonus = 0;
    if (typeof window !== 'undefined' && window.questTriggerManager && typeof window.questTriggerManager.getSkillEffect === 'function') {
      skillBonus = window.questTriggerManager.getSkillEffect('examBonus') || 0;
    }
    const rate = base + knowledgeBonus + profBonus + skillBonus - difficultyPenalty;
    return Math.max(0.05, Math.min(0.95, rate));
  },

  /**
   * 抽题：随机抽取 n 道不重复题目
   */
  drawQuestions(subject = '高等数学', count = 3) {
    const bank = this.questionBank[subject] || this.questionBank['高等数学'];
    const shuffled = [...bank].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, shuffled.length));
  },

  /**
   * 运行考试挑战
   * @param {Object} options
   *   - questId: 任务ID
   *   - subject: 科目
   *   - difficulty: 难度
   *   - characterStats: 角色属性
   *   - proficiency: 熟练度
   *   - onUpdate: 每次答题回调 { question, selected, correct, correctCount, total }
   *   - autoWin: 调试/自动模式直接成功
   * @returns {Promise<{success: boolean, score: number, correctCount: number, total: number, message: string}>}
   */
  async runChallenge(options = {}) {
    const {
      subject = '高等数学',
      difficulty = 2,
      characterStats = {},
      proficiency = {},
      onUpdate = null,
      autoWin = false
    } = options;

    if (autoWin) {
      return {
        success: true,
        score: 100,
        correctCount: 3,
        total: 3,
        message: '（自动模式）考试挑战成功！'
      };
    }

    // 无 UI 模式：基于成功率与抽题随机判定
    if (!this.useBattleUI) {
      const questions = this.drawQuestions(subject, 3);
      const successRate = this.calculateSuccessRate(characterStats, proficiency, subject, difficulty);
      let correctCount = 0;
      for (const q of questions) {
        if (Math.random() < successRate) {
          correctCount++;
        }
      }
      const score = Math.round((correctCount / questions.length) * 100);
      const pass = correctCount / questions.length >= 0.6;
      return {
        success: pass,
        score,
        correctCount,
        total: questions.length,
        message: pass
          ? `无 UI 模式考试通过！得分 ${score} 分`
          : `无 UI 模式考试未通过，得分 ${score} 分`
      };
    }

    const questions = this.drawQuestions(subject, 3);
    let correctCount = 0;

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const selected = await this._askQuestion(q, i + 1, questions.length);
      const isCorrect = selected === q.correct;
      if (isCorrect) correctCount++;

      if (typeof onUpdate === 'function') {
        onUpdate({ question: q, selected, correct: q.correct, correctCount, total: questions.length });
      }
    }

    // 判定：至少答对 60% 视为通过
    const passRate = 0.6;
    const success = correctCount / questions.length >= passRate;
    const score = Math.round((correctCount / questions.length) * 100);

    return {
      success,
      score,
      correctCount,
      total: questions.length,
      message: success
        ? `考试通过！得分 ${score} 分`
        : `考试未通过，得分 ${score} 分，请复习后再来`
    };
  },

  /**
   * 在真实浏览器中通过 confirm/prompt 与用户交互
   * 为最小闭环，使用 confirm 选择选项；后续可替换为更华丽的 UI。
   */
  async _askQuestion(question, current, total) {
    const optionsText = question.options
      .map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`)
      .join('\n');
    const input = window.prompt(
      `[第 ${current}/${total} 题]\n${question.question}\n\n${optionsText}\n\n请输入选项序号（0,1,2...）`
    );
    if (input === null) return -1;
    const parsed = parseInt(input, 10);
    return isNaN(parsed) ? -1 : parsed;
  },

  /**
   * 应用考试结果到角色属性
   * @returns {Object} 修改后的属性变化
   */
  applyResult(characterStats, result, questRewards = {}) {
    const changes = {};
    if (result.success) {
      if (questRewards.experience) {
        characterStats.experience = (characterStats.experience || 0) + questRewards.experience;
        changes.experience = questRewards.experience;
      }
      if (questRewards.knowledge) {
        characterStats.knowledge = (characterStats.knowledge || 0) + questRewards.knowledge;
        changes.knowledge = questRewards.knowledge;
      }
      if (questRewards.money) {
        characterStats.money = (characterStats.money || 0) + questRewards.money;
        changes.money = questRewards.money;
      }
      if (questRewards.mood) {
        characterStats.mood = (characterStats.mood || 0) + questRewards.mood;
        changes.mood = questRewards.mood;
      }
    } else {
      // 失败惩罚：扣体力与心情
      const staminaPenalty = 10;
      const moodPenalty = 5;
      characterStats.stamina = Math.max(0, (characterStats.stamina || 0) - staminaPenalty);
      characterStats.mood = Math.max(0, (characterStats.mood || 0) - moodPenalty);
      changes.stamina = -staminaPenalty;
      changes.mood = -moodPenalty;
    }
    return changes;
  }
};

export default ExamChallengeAdapter;
