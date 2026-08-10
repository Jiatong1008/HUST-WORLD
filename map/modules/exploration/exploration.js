/**
 * 探索打卡模块
 * 
 * 功能：
 *   - 从数据库加载可探索地点
 *   - 检测角色是否靠近探索点
 *   - 显示探索提示框
 *   - 按 F 键完成探索并保存到数据库
 */

class ExplorationModule {
  constructor(apiBase) {
    this.apiBase = apiBase;
    this.explorationLocations = [];
    this.exploredLocations = new Set();
    this.nearestLocation = null;
    this.explorationRange = 60;
    this.characterId = 1;
    
    this.hintEl = null;
    this.successEl = null;
  }

  init(characterId = 1) {
    this.characterId = characterId;
    this._createDOM();
    this._bindEvents();
    this._loadData();
  }

  _createDOM() {
    this.hintEl = document.createElement('div');
    this.hintEl.id = 'explorationHint';
    this.hintEl.innerHTML = '<span>F探索</span>';
    this.hintEl.style.cssText = `
      display: none;
      position: fixed;
      background: #ffffff;
      border: 1px solid #333333;
      border-radius: 4px;
      padding: 4px 8px;
      z-index: 500;
      pointer-events: none;
      box-shadow: 1px 1px 3px rgba(0,0,0,0.2);
      font-size: 12px;
      font-weight: bold;
      color: #333;
    `;
    document.body.appendChild(this.hintEl);

    this.successEl = document.createElement('div');
    this.successEl.id = 'explorationSuccess';
    this.successEl.innerHTML = `
      <div id="explorationBox" style="
        background: #1a1a2e;
        border: 2px solid #00d4ff;
        border-radius: 12px;
        padding: 30px 40px;
        text-align: center;
        min-width: 350px;
      ">
        <div id="explorationIcon" style="font-size: 64px; margin-bottom: 15px;">📸</div>
        <div id="explorationTitle" style="color: #00d4ff; font-size: 28px; font-weight: bold; margin-bottom: 10px;">探索成功！</div>
        <div id="explorationLocation" style="color: #fff; font-size: 18px; margin-bottom: 10px;"></div>
        <div id="explorationProgress" style="color: #aaa; font-size: 14px;"></div>
      </div>
    `;
    this.successEl.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      z-index: 1500;
      justify-content: center;
      align-items: center;
    `;
    document.body.appendChild(this.successEl);
  }

  _bindEvents() {
    document.addEventListener('keydown', (e) => {
      const key = e.key || '';
      if (key.toLowerCase() === 'f') {
        this._performExploration();
      }
    });
  }

  async _loadData() {
    try {
      const [explorations, characterExplorations] = await Promise.all([
        this._fetchAPI(`${this.apiBase}/exploration/campus`),
        this._fetchAPI(`${this.apiBase}/exploration/character/${this.characterId}`)
      ]);

      this.explorationLocations = explorations;
      this.exploredLocations = new Set(characterExplorations.map(e => e.map_id));

      console.log(`[Exploration] 加载了 ${this.explorationLocations.length} 个探索点，已探索 ${this.exploredLocations.size} 个`);
    } catch (error) {
      console.error('[Exploration] 数据加载失败:', error);
    }
  }

  async _fetchAPI(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const body = await res.json();
    return body && body.success === true && body.data !== undefined ? body.data : body;
  }

  checkNearby(x, y) {
    this.nearestLocation = this._getNearbyLocation(x, y);
    
    if (this.nearestLocation && !this.exploredLocations.has(this.nearestLocation.map_id)) {
      this.hintEl.classList.add('show');
    } else {
      this.hintEl.classList.remove('show');
    }

    return this.nearestLocation;
  }

  _getNearbyLocation(x, y) {
    let nearest = null;
    let minDist = this.explorationRange;

    for (const loc of this.explorationLocations) {
      if (this.exploredLocations.has(loc.map_id)) continue;

      const dist = Math.sqrt((loc.x_coordinate - x) ** 2 + (loc.y_coordinate - y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = loc;
      }
    }

    return nearest;
  }

  renderHint(screenPos, canvasRect) {
    if (!this.nearestLocation || this.exploredLocations.has(this.nearestLocation.map_id)) {
      this.hintEl.style.display = 'none';
      return;
    }

    this.hintEl.style.display = 'block';
    const characterRadius = 16;
    this.hintEl.style.left = (canvasRect.left + screenPos.x + characterRadius + 5) + 'px';
    this.hintEl.style.top = (canvasRect.top + screenPos.y - 8) + 'px';
  }

  async _performExploration() {
    const target = this.nearestLocation;
    if (!target || !target.map_name) {
      console.log('[Exploration] 没有找到附近的探索点');
      return;
    }

    if (this.exploredLocations.has(target.map_id)) {
      console.log('[Exploration] 该地点已探索');
      return;
    }

    console.log('[Exploration] 尝试探索:', target.map_name);

    try {
      const response = await fetch(`${this.apiBase}/exploration/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          characterId: this.characterId,
          explorationId: target.exploration_id
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `HTTP错误: ${response.status}`);
      }

      const result = await response.json();
      console.log('[Exploration] 探索成功:', result);

      this.exploredLocations.add(target.map_id);
      this.hintEl.style.display = 'none';

      document.getElementById('explorationLocation').textContent = `已在「${target.map_name}」拍照打卡`;
      document.getElementById('explorationProgress').textContent = `探索进度: ${this.exploredLocations.size} / ${this.explorationLocations.length}`;
      this.successEl.style.display = 'flex';

      setTimeout(() => {
        this.successEl.style.display = 'none';
      }, 2500);

    } catch (error) {
      console.error('[Exploration] 探索失败:', error.message);
    }
  }

  getProgress() {
    return {
      explored: this.exploredLocations.size,
      total: this.explorationLocations.length
    };
  }

  getExplorationLocations() {
    return this.explorationLocations;
  }

  getExploredLocations() {
    return this.exploredLocations;
  }
}

export default ExplorationModule;
