(function (global) {
  'use strict';

  const STORAGE_KEY = 'hust_world_campus_week_v1';
  const PROGRESS_KEY = 'campusWeek';
  const ASSET_BASE = '/game/assets/hust-week';

  const CHAPTERS = [
    {
      id: 'day0', day: 'DAY 0', title: '从校门开始', place: '主校区校门',
      image: `${ASSET_BASE}/gate.webp`,
      copy: '报到日的人流像一条还没画完的路线。你可以先把“我该去哪儿”变成一次具体的相遇。',
      prompt: '志愿者问：要不要一起核对报到清单？',
      options: [
        { id: 'walk-with-volunteer', label: '跟着志愿者走一段', description: '把路线记在对话里，也认识第一个同伴。', effects: { social: 2, exploration: 1 }, memory: '报到清单' },
        { id: 'make-own-route', label: '先自己走一遍', description: '绕一点路，但把校门到宿舍的方向记在脚下。', effects: { study: 1, exploration: 2 }, memory: '第一张手绘路线' }
      ]
    },
    {
      id: 'day2', day: 'DAY 2', title: '在图书馆找答案', place: '图书馆',
      image: `${ASSET_BASE}/library.jpg`, lineArt: `${ASSET_BASE}/line-art/library.png`,
      copy: '课程群里冒出一个陌生概念。图书馆的安静不是答案，而是让你决定从哪里开始找。',
      prompt: '你为今晚的学习留下一条什么样的线索？',
      options: [
        { id: 'search-shelves', label: '先从馆藏与索书号开始', description: '把一个模糊问题拆成关键词、书架和笔记。', effects: { study: 3 }, memory: '检索便签' },
        { id: 'compare-ai-sources', label: '用 AI 辅助梳理，再回到原始资料', description: '让工具帮你搭框架，但把出处和判断留给自己。', effects: { study: 2, social: 1 }, memory: '文献对照表' }
      ]
    },
    {
      id: 'day5', day: 'DAY 5', title: '夜色里的醉晚亭', place: '醉晚亭',
      image: `${ASSET_BASE}/zuiwan-night.jpg`, lineArt: `${ASSET_BASE}/line-art/zuiwan.png`,
      copy: '一周快结束时，雨停了。沿着灯光走到亭边，白天匆忙经过的地方忽然有了另一种尺度。',
      prompt: '你打算怎样收下这一晚？',
      options: [
        { id: 'share-night-view', label: '和新认识的同学拍下夜景', description: '照片里有亭、有水面，也有一段不必赶路的对话。', effects: { social: 2, exploration: 2 }, memory: '夜游合影' },
        { id: 'write-night-note', label: '独自绕一圈，写下观察', description: '把路线、风声和明天要做的事折进一页笔记。', effects: { study: 1, exploration: 3 }, memory: '夜行札记' }
      ]
    },
    {
      id: 'day7', day: 'DAY 7', title: '把地图交给下一个人', place: '校史陈列馆前',
      image: `${ASSET_BASE}/history-museum.jpg`, lineArt: `${ASSET_BASE}/line-art/history-museum.png`,
      copy: '一位新同学站在路口，问起报到、图书馆和晚上能去哪里。你发现自己已经能给出一条有温度的路线。',
      prompt: '你把这一周的经验递给对方。',
      options: [
        { id: 'pass-on-map', label: '把你走过的路线讲给 TA 听', description: '不是标准答案，而是可从任何一处开始的校园地图。', effects: { social: 2, exploration: 1 }, memory: '传出去的地图' },
        { id: 'share-study-note', label: '把整理好的学习线索分享给 TA', description: '告诉 TA：工具会变，但求证和记录会一直有用。', effects: { study: 2, social: 1 }, memory: '被接住的笔记' }
      ]
    }
  ];

  const STAT_LABELS = { study: '求知', social: '连接', exploration: '探索' };
  let root = null;
  let isOpen = false;

  function createInitialState() {
    return {
      version: 1,
      completed: [],
      choices: {},
      stats: { study: 0, social: 0, exploration: 0 },
      memories: [],
      ending: null,
      updatedAt: null
    };
  }

  function normalizeState(value) {
    const state = value && typeof value === 'object' ? value : {};
    return {
      ...createInitialState(),
      ...state,
      completed: Array.isArray(state.completed) ? [...new Set(state.completed)] : [],
      choices: state.choices && typeof state.choices === 'object' ? { ...state.choices } : {},
      stats: { ...createInitialState().stats, ...(state.stats || {}) },
      memories: Array.isArray(state.memories) ? state.memories : []
    };
  }

  function getState() {
    try {
      if (global.saveManager && typeof global.saveManager.getProgressField === 'function') {
        return normalizeState(global.saveManager.getProgressField(PROGRESS_KEY, createInitialState()));
      }
      const raw = global.localStorage && global.localStorage.getItem(STORAGE_KEY);
      return normalizeState(raw ? JSON.parse(raw) : null);
    } catch (error) {
      console.warn('[CampusWeek] 读取进度失败：', error.message);
      return createInitialState();
    }
  }

  function persist(state) {
    const next = normalizeState({ ...state, updatedAt: new Date().toISOString() });
    if (global.saveManager && typeof global.saveManager.setProgressField === 'function') {
      global.saveManager.setProgressField(PROGRESS_KEY, next);
    } else if (global.localStorage) {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    }
    return next;
  }

  function chapterById(id) {
    return CHAPTERS.find(chapter => chapter.id === id) || null;
  }

  function getAvailableChapter(state = getState()) {
    return CHAPTERS.find(chapter => !state.completed.includes(chapter.id)) || null;
  }

  function getEnding(state) {
    const entries = Object.entries(state.stats || {});
    const top = entries.sort((a, b) => b[1] - a[1])[0]?.[0] || 'exploration';
    const endings = {
      study: { title: '把好奇做成办法', description: '你带走的不只是几条知识链接，而是一种把问题拆开、核对、再讲给别人听的方法。' },
      social: { title: '成为彼此的坐标', description: '这一周的路线因为有人同行而清晰。你开始明白，校园地图也由每一次互相回应画成。' },
      exploration: { title: '把校园走成自己的地图', description: '从校门到亭边，你把陌生地名走成了自己的方向；下一次，你也能替别人点亮一盏路灯。' }
    };
    return { ...endings[top], focus: top };
  }

  function escape(value) {
    return String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
  }

  function render() {
    if (!root) return;
    const state = getState();
    const active = getAvailableChapter(state);
    const completedCount = state.completed.length;
    const ending = state.ending || (completedCount === CHAPTERS.length ? getEnding(state) : null);
    const chapter = active || CHAPTERS[CHAPTERS.length - 1];
    const memoryHtml = state.memories.length
      ? state.memories.map(memory => `<li><strong>${escape(memory.label)}</strong><small>${escape(memory.place)}</small></li>`).join('')
      : '<li class="campus-week-empty">完成一个片段后，这里会留下你的校园记忆。</li>';

    root.innerHTML = `
      <button class="campus-week-launcher" type="button" data-action="open" aria-label="打开喻园第一周">喻园<br><span>第一周</span></button>
      <section class="campus-week-overlay" aria-hidden="${isOpen ? 'false' : 'true'}">
        <div class="campus-week-dialog" role="dialog" aria-modal="true" aria-labelledby="campus-week-title">
          <button class="campus-week-close" type="button" data-action="close" aria-label="关闭">×</button>
          <header class="campus-week-header">
            <p class="campus-week-kicker">PERSONAL EDITION · NARRATIVE VERTICAL SLICE</p>
            <h2 id="campus-week-title">喻园第一周</h2>
            <p>把校园走成自己的地图</p>
            <div class="campus-week-progress" aria-label="主线进度"><span style="width:${(completedCount / CHAPTERS.length) * 100}%"></span></div>
            <small>已完成 ${completedCount} / ${CHAPTERS.length} 个片段</small>
          </header>
          <div class="campus-week-body">
            <aside class="campus-week-route" aria-label="故事路线">
              ${CHAPTERS.map(item => {
                const done = state.completed.includes(item.id);
                const current = active && active.id === item.id;
                return `<button type="button" class="campus-week-route-item ${done ? 'is-done' : ''} ${current ? 'is-current' : ''}" data-chapter="${item.id}" ${(!done && !current) ? 'disabled' : ''}><i>${item.day}</i><strong>${item.title}</strong></button>`;
              }).join('')}
            </aside>
            <main class="campus-week-scene">
              ${ending ? renderEnding(ending, state, memoryHtml) : renderChapter(chapter, state)}
            </main>
            <aside class="campus-week-memories">
              <h3>这一周的记忆</h3>
              <ul>${memoryHtml}</ul>
              <div class="campus-week-stats">${Object.entries(STAT_LABELS).map(([key, label]) => `<div><span>${label}</span><strong>${state.stats[key] || 0}</strong></div>`).join('')}</div>
              <button type="button" class="campus-week-reset" data-action="reset">重新体验本周</button>
            </aside>
          </div>
          <footer>场景参考素材仅用于本项目原型展示；公开发布前请确认图片与校方视觉资产的授权。</footer>
        </div>
      </section>`;
    root.querySelector('[data-action="open"]').addEventListener('click', open);
    root.querySelector('[data-action="close"]').addEventListener('click', close);
    root.querySelector('[data-action="reset"]').addEventListener('click', reset);
    root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => choose(button.dataset.chapter, button.dataset.choice)));
    root.querySelectorAll('[data-chapter]').forEach(button => button.addEventListener('click', () => showChapter(button.dataset.chapter)));
  }

  function renderChapter(chapter, state) {
    const choice = state.choices[chapter.id];
    const isCompleted = state.completed.includes(chapter.id);
    return `
      <figure class="campus-week-visual"><img src="${chapter.image}" alt="${chapter.place} 场景参考图"><figcaption>${chapter.place} · 场景参考</figcaption></figure>
      <div class="campus-week-chapter-copy">
        <p class="campus-week-day">${chapter.day} · ${chapter.place}</p><h3>${chapter.title}</h3><p>${chapter.copy}</p>
        <h4>${chapter.prompt}</h4>
        <div class="campus-week-choices">${chapter.options.map(option => `<button type="button" data-choice="${option.id}" data-chapter="${chapter.id}" ${isCompleted ? 'disabled' : ''}><strong>${option.label}</strong><span>${option.description}</span><em>${formatEffects(option.effects)}</em></button>`).join('')}</div>
        ${choice ? `<p class="campus-week-selected">已选择：${escape(chapter.options.find(option => option.id === choice)?.label || choice)}</p>` : ''}
      </div>`;
  }

  function renderEnding(ending, state, memoryHtml) {
    return `
      <figure class="campus-week-visual campus-week-ending-visual"><img src="${ASSET_BASE}/zuiwan-day.jpg" alt="醉晚亭日景"><figcaption>你已经拥有一张可以分享的校园地图</figcaption></figure>
      <div class="campus-week-chapter-copy campus-week-ending">
        <p class="campus-week-day">WEEK COMPLETE · 7 DAYS</p><h3>${ending.title}</h3><p>${ending.description}</p>
        <div class="campus-week-ending-note"><strong>完成闭环</strong><span>报到时被帮助 → 在图书馆形成方法 → 夜游产生记忆 → 将经验交给下一位同学。</span></div>
        <h4>记忆清单</h4><ul class="campus-week-mobile-memories">${memoryHtml}</ul>
      </div>`;
  }

  function formatEffects(effects) {
    return Object.entries(effects).map(([key, value]) => `${STAT_LABELS[key]} +${value}`).join(' · ');
  }

  function choose(chapterId, choiceId) {
    const chapter = chapterById(chapterId);
    const state = getState();
    const active = getAvailableChapter(state);
    if (!chapter || !active || active.id !== chapterId || state.completed.includes(chapterId)) return false;
    const option = chapter.options.find(item => item.id === choiceId);
    if (!option) return false;
    const next = normalizeState(state);
    next.choices[chapterId] = choiceId;
    next.completed.push(chapterId);
    for (const [stat, amount] of Object.entries(option.effects)) next.stats[stat] = (Number(next.stats[stat]) || 0) + amount;
    next.memories.push({ chapterId, label: option.memory, place: chapter.place, image: chapter.image });
    if (next.completed.length === CHAPTERS.length) next.ending = getEnding(next);
    persist(next);
    if (global.UIFeedback && global.UIFeedback.showToast) global.UIFeedback.showToast(`已记录：${option.memory}`, 'success', 2200);
    render();
    return true;
  }

  function showChapter(chapterId) {
    const chapter = chapterById(chapterId);
    if (!chapter || !root) return;
    const state = getState();
    if (!state.completed.includes(chapterId) && getAvailableChapter(state)?.id !== chapterId) return;
    // 已完成章节暂时复用当前叙事面板，避免误以为能重复获得奖励。
    const scene = root.querySelector('.campus-week-scene');
    if (scene) scene.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function open() { isOpen = true; render(); global.document.body.classList.add('campus-week-open'); }
  function close() { isOpen = false; render(); global.document.body.classList.remove('campus-week-open'); }
  function reset() { persist(createInitialState()); render(); }
  function init() {
    if (!global.document) return null;
    if (!root) { root = global.document.createElement('div'); root.id = 'campus-week-root'; global.document.body.appendChild(root); }
    if (!global.__campusWeekEscapeBound) {
      global.document.addEventListener('keydown', event => { if (event.key === 'Escape' && isOpen) close(); });
      global.__campusWeekEscapeBound = true;
    }
    render();
    return api;
  }

  const api = { init, open, close, reset, choose, getState, getAvailableChapter, chapters: CHAPTERS };
  global.CampusWeekManager = api;
})(typeof window !== 'undefined' ? window : globalThis);
