/**
 * 跑酷游戏模块
 * 
 * 功能：
 *   - 点击操场地点触发跑酷游戏
 *   - 双轨道切换玩法
 *   - 使用素材图片渲染
 */

class RunnerGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.state = 'waiting';
    this.score = 0;
    this.gameSpeed = 3;
    this.frameCount = 0;
    this.walkFrame = 0;
    this.lastSpawnFrame = 0;
    this.lastSpeedIncreaseFrame = 0;
    this.W = canvas.width;
    this.H = canvas.height;
    this.GROUND_Y = this.H - 95;
    this.UPPER_Y = this.H - 275;
    this.PLAYER_X = 100;
    this.obstacles = [];
    this.coins = [];
    this.keys = {};
    this.gameLoopTimer = null;

    this.player = {
      y: this.GROUND_Y - 60,
      height: 60,
      width: 40,
      onUpper: false,
      isJumping: false,
      jumpTimer: 0,
      isHit: false,
      hitTimer: 0
    };

    this.setupInput();
    this.loadAssets();
  }

  resize(width, height) {
    this.W = Math.max(640, Math.floor(width));
    this.H = Math.max(360, Math.floor(height));
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    this.canvas.style.width = `${this.W}px`;
    this.canvas.style.height = `${this.H}px`;

    this.GROUND_Y = this.H - 95;
    this.UPPER_Y = Math.max(95, this.H - 275);
    this.PLAYER_X = Math.max(82, Math.min(140, this.W * 0.13));

    if (this.player) {
      this.player.y = this.player.onUpper
        ? this.UPPER_Y - this.player.height
        : this.GROUND_Y - this.player.height;
    }

    this.render();
  }

  loadAssets() {
    // 使用 import.meta.url 构建绝对路径，确保模块无论从哪里被导入都能正确加载图片
    const assetBase = new URL('../../public/runner_assets/', import.meta.url).href;
    console.log('[RunnerGame] 素材基础路径:', assetBase);

    this.assets = {
      walkA: new Image(),
      walkB: new Image(),
      jump: new Image(),
      hit: new Image(),
      obstacle: new Image(),
      obstacle2: new Image(),
      coin: new Image(),
      background: new Image()
    };

    // 绿色角色精灵（行走、跳跃、受伤）
    this.assets.walkA.src    = assetBase + 'Sprites/Characters/Green/character_green_walk_a.png';
    this.assets.walkB.src    = assetBase + 'Sprites/Characters/Green/character_green_walk_b.png';
    this.assets.jump.src     = assetBase + 'Sprites/Characters/Green/character_green_jump.png';
    this.assets.hit.src      = assetBase + 'Sprites/Characters/Green/character_green_hit.png';
    // 障碍物
    this.assets.obstacle.src  = assetBase + 'cactus.png';
    this.assets.obstacle2.src = assetBase + 'rock.png';
    // 金币
    this.assets.coin.src      = assetBase + 'coin_gold.png';
    // 背景
    this.assets.background.src = assetBase + 'Sprites/Backgrounds/Default/background_clouds.png';

    this.assetsLoaded = false;
    this.assetsLoadErrors = [];

    const loadPromises = Object.entries(this.assets).map(([key, img]) =>
      new Promise(resolve => {
        img.onload = () => {
          console.log(`[RunnerGame] ✅ 素材加载成功: ${key}`);
          resolve();
        };
        img.onerror = () => {
          const url = img.src;
          console.warn(`[RunnerGame] ❌ 素材加载失败: ${key} → ${url}`);
          this.assetsLoadErrors.push({ key, url });
          resolve(); // 不阻塞，回退到纯色渲染
        };
      })
    );
    Promise.all(loadPromises).then(() => {
      this.assetsLoaded = true;
      if (this.assetsLoadErrors.length > 0) {
        console.warn(`[RunnerGame] 共 ${this.assetsLoadErrors.length} 个素材加载失败，将使用纯色回退`);
      } else {
        console.log('[RunnerGame] 🎉 所有素材加载完成！');
      }
    });
  }

  setupInput() {
    window.addEventListener('keydown', e => {
      this.keys[e.code] = true;
      if (e.key === 'Enter') this.keys['Enter'] = true;
    });
    window.addEventListener('keyup', e => {
      this.keys[e.code] = false;
      if (e.key === 'Enter') this.keys['Enter'] = false;
    });
  }

  start() {
    this.state = 'playing';
    this.score = 0;
    this.gameSpeed = 3;
    this.frameCount = 0;
    this.lastSpawnFrame = 0;
    this.lastSpeedIncreaseFrame = 0;
    this.walkFrame = 0;
    this.player = {
      y: this.GROUND_Y - 60,
      height: 60,
      width: 40,
      onUpper: false,
      isJumping: false,
      jumpTimer: 0,
      isHit: false,
      hitTimer: 0
    };
    this.obstacles = [];
    this.coins = [];

    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
    }
    this.gameLoop();
  }

  switchTrack() {
    if (this.player.isJumping) return;
    this.player.isJumping = true;
    this.player.jumpTimer = 0;
    this.player.onUpper = !this.player.onUpper;
    this.player.y = this.player.onUpper ? this.UPPER_Y - this.player.height : this.GROUND_Y - this.player.height;
  }

  canSpawnAt(x) {
    const minDistance = 50;
    for (const obs of this.obstacles) {
      if (Math.abs(x - obs.x) < minDistance) return false;
    }
    for (const c of this.coins) {
      if (Math.abs(x - c.x) < minDistance) return false;
    }
    return true;
  }

  update() {
    if (this.state !== 'playing') return;

    this.frameCount++;
    this.score++;
    this.walkFrame = (this.walkFrame + 1) % 20;

    if (this.player.isJumping) {
      this.player.jumpTimer++;
      if (this.player.jumpTimer >= 30) {
        this.player.isJumping = false;
      }
    }

    if (this.player.isHit) {
      this.player.hitTimer++;
    }

    if (this.frameCount - this.lastSpeedIncreaseFrame >= 1800) {
      this.gameSpeed = Math.min(8, this.gameSpeed + 0.5);
      this.lastSpeedIncreaseFrame = this.frameCount;
    }

    const baseInterval = 35;
    const currentInterval = Math.max(20, baseInterval - Math.floor((this.gameSpeed - 3) * 3));

    if (this.frameCount - this.lastSpawnFrame >= currentInterval && this.canSpawnAt(this.W + 50)) {
      const track = Math.random() < 0.5 ? 'lower' : 'upper';
      const type = Math.random() < 0.55 ? 'obstacle' : 'coin';
      const y = track === 'lower' ? this.GROUND_Y - 50 : this.UPPER_Y - 50;

      if (type === 'obstacle') {
        const variant = Math.random() < 0.5 ? 'cactus' : 'rock';
        this.obstacles.push({ x: this.W + 50, y: y, track: track, width: 35, height: 50, variant: variant });
      } else {
        this.coins.push({ x: this.W + 50, y: y + 10, track: track, collected: false });
      }
      this.lastSpawnFrame = this.frameCount;
    }

    if (this.keys['Space']) {
      this.keys['Space'] = false;
      this.switchTrack();
    }

    this.obstacles = this.obstacles.filter(obs => {
      obs.x -= this.gameSpeed;
      if (obs.x < -50) return false;

      if (obs.track !== (this.player.onUpper ? 'upper' : 'lower')) return true;

      if (obs.x < this.PLAYER_X + this.player.width &&
          obs.x + obs.width > this.PLAYER_X &&
          this.player.y < obs.y + 25 &&
          this.player.y + this.player.height > obs.y - 25) {
        this.player.isHit = true;
        this.gameOver();
      }
      return true;
    });

    this.coins = this.coins.filter(coin => {
      coin.x -= this.gameSpeed;
      if (coin.x < -30) return false;

      if (coin.track !== (this.player.onUpper ? 'upper' : 'lower')) return true;

      if (!coin.collected &&
          coin.x < this.PLAYER_X + this.player.width &&
          coin.x + 25 > this.PLAYER_X &&
          this.player.y < coin.y + 12 &&
          this.player.y + this.player.height > coin.y - 12) {
        this.score += 100;
        coin.collected = true;
        return false;
      }
      return true;
    });
  }

  render() {
    const canDraw = (img) => img && img.complete && img.naturalWidth > 0;

    this.ctx.fillStyle = '#87CEEB';
    this.ctx.fillRect(0, 0, this.W, this.H);

    if (this.assetsLoaded && canDraw(this.assets.background)) {
      this.ctx.drawImage(this.assets.background, 0, 0, this.W, this.H);
    }

    this.ctx.fillStyle = '#8b7b5e';
    this.ctx.fillRect(0, this.GROUND_Y, this.W, 20);
    this.ctx.fillStyle = '#7a7a95';
    this.ctx.fillRect(0, this.UPPER_Y, this.W, 20);

    this.obstacles.forEach(obs => {
      const obsImg = obs.variant === 'rock' ? this.assets.obstacle2 : this.assets.obstacle;
      if (this.assetsLoaded && canDraw(obsImg)) {
        this.ctx.drawImage(obsImg, obs.x, obs.y, obs.width, obs.height);
      } else {
        this.ctx.fillStyle = '#228B22';
        this.ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }
    });

    this.coins.forEach(coin => {
      if (this.assetsLoaded && canDraw(this.assets.coin)) {
        this.ctx.drawImage(this.assets.coin, coin.x, coin.y, 25, 25);
      } else {
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.arc(coin.x + 12, coin.y + 12, 12, 0, Math.PI * 2);
        this.ctx.fill();
      }
    });

    let currentSprite = this.assets.walkA;
    if (this.player.isHit && canDraw(this.assets.hit)) {
      currentSprite = this.assets.hit;
    } else if (this.player.isJumping && canDraw(this.assets.jump)) {
      currentSprite = this.assets.jump;
    } else if (this.walkFrame < 10 && canDraw(this.assets.walkA)) {
      currentSprite = this.assets.walkA;
    } else if (canDraw(this.assets.walkB)) {
      currentSprite = this.assets.walkB;
    }

    if (canDraw(currentSprite)) {
      this.ctx.drawImage(currentSprite, this.PLAYER_X, this.player.y, this.player.width, this.player.height);
    } else {
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.fillRect(this.PLAYER_X, this.player.y, this.player.width, this.player.height);
      this.ctx.fillStyle = '#81C784';
      this.ctx.fillRect(this.PLAYER_X + 5, this.player.y + 5, 8, 8);
      this.ctx.fillRect(this.PLAYER_X + 27, this.player.y + 5, 8, 8);
      this.ctx.fillStyle = '#2E7D32';
      this.ctx.fillRect(this.PLAYER_X + 8, this.player.y + this.player.height - 15, 8, 15);
      this.ctx.fillRect(this.PLAYER_X + 24, this.player.y + this.player.height - 15, 8, 15);
    }

    this.ctx.fillStyle = '#fff';
    this.ctx.font = 'bold 24px Arial';
    this.ctx.fillText('Score: ' + this.score, 20, 35);

    if (this.state === 'waiting') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.W, this.H);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = 'bold 40px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Runner Game', this.W / 2, this.H / 2 - 30);
      this.ctx.font = '20px Arial';
      this.ctx.fillText('Press ENTER to start', this.W / 2, this.H / 2 + 20);
      this.ctx.font = '16px Arial';
      this.ctx.fillText('Press SPACE to switch track', this.W / 2, this.H / 2 + 50);
      this.ctx.textAlign = 'left';
    }

    if (this.state === 'over') {
      this.ctx.fillStyle = 'rgba(0,0,0,0.7)';
      this.ctx.fillRect(0, 0, this.W, this.H);
      this.ctx.fillStyle = '#ff4444';
      this.ctx.font = 'bold 40px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText('Game Over', this.W / 2, this.H / 2 - 30);
      this.ctx.fillStyle = '#ffd700';
      this.ctx.font = '24px Arial';
      this.ctx.fillText('Final Score: ' + this.score, this.W / 2, this.H / 2 + 20);
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '18px Arial';
      this.ctx.fillText('Press ENTER to restart', this.W / 2, this.H / 2 + 55);
      this.ctx.textAlign = 'left';
    }
  }

  gameOver() {
    this.state = 'over';
    // 通知外部游戏结束
    if (this.onGameOver) {
      this.onGameOver(this.score);
    }
  }

  gameLoop() {
    if (this.state === 'waiting' || this.state === 'over') {
      this.render();
      if ((this.state === 'waiting' || this.state === 'over') && this.keys['Enter']) {
        this.keys['Enter'] = false;
        this.start();
        return;
      }
      requestAnimationFrame(() => this.gameLoop());
      return;
    }

    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
    }

    this.gameLoopTimer = setInterval(() => {
      if (this.state !== 'playing') {
        clearInterval(this.gameLoopTimer);
        this.gameLoop();
        return;
      }
      this.update();
      this.render();
    }, 16);
  }

  getScore() {
    return this.score;
  }

  getState() {
    return this.state;
  }

  stop() {
    if (this.gameLoopTimer) {
      clearInterval(this.gameLoopTimer);
    }
    this.state = 'waiting';
  }
}

class RunnerModule {
  constructor() {
    this.enabled = true;
    this.game = null;
    this.overlayEl = null;
    this.canvasEl = null;
    this.closeBtn = null;
    this.onGameEnd = null; // 游戏结束回调
  }

  init() {
    if (!this.enabled) return;

    this._createDOM();
    this._bindEvents();
  }

  _createDOM() {
    this.overlayEl = document.createElement('div');
    this.overlayEl.id = 'runnerOverlay';
    this.overlayEl.style.cssText = `
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.9);
      z-index: 2000;
      justify-content: center;
      align-items: center;
      flex-direction: column;
    `;

    this.canvasEl = document.createElement('canvas');
    this.canvasEl.id = 'runnerCanvas';
    this.canvasEl.style.cssText = `
      position: relative;
      top: auto;
      left: auto;
      border: 2px solid #4fc3f7;
      border-radius: 8px;
      background: #1a1a2e;
      display: block;
      max-width: calc(100vw - 48px);
      max-height: calc(100vh - 110px);
    `;

    this.closeBtn = document.createElement('button');
    this.closeBtn.id = 'runnerClose';
    this.closeBtn.textContent = '退出跑酷';
    this.closeBtn.style.cssText = `
      margin-top: 20px;
      padding: 10px 30px;
      background: #f44336;
      color: white;
      border: none;
      border-radius: 5px;
      cursor: pointer;
      font-size: 16px;
    `;

    this.overlayEl.appendChild(this.canvasEl);
    this.overlayEl.appendChild(this.closeBtn);
    document.body.appendChild(this.overlayEl);

    this.game = new RunnerGame(this.canvasEl);
    this.resize();
  }

  _bindEvents() {
    this.closeBtn.addEventListener('click', () => {
      this.hide();
    });

    this.overlayEl.addEventListener('click', (e) => {
      if (e.target === this.overlayEl) {
        this.hide();
      }
    });

    window.addEventListener('resize', () => {
      if (this.isVisible()) this.resize();
    });
  }

  resize() {
    if (!this.game) return;
    const availableW = Math.max(640, window.innerWidth - 64);
    const availableH = Math.max(360, window.innerHeight - 132);
    const targetRatio = 16 / 9;
    let width = Math.min(1180, availableW);
    let height = width / targetRatio;

    if (height > availableH) {
      height = Math.min(640, availableH);
      width = height * targetRatio;
    }

    this.game.resize(width, height);
  }

  show() {
    this.resize();
    this.overlayEl.style.display = 'flex';
    // 设置游戏结束回调
    this.game.onGameOver = (score) => {
      if (this.onGameEnd) {
        this.onGameEnd(score);
      }
    };
    this.game.start();
  }

  hide() {
    this.overlayEl.style.display = 'none';
    this.game.stop();
  }

  isVisible() {
    return this.overlayEl.style.display === 'flex';
  }
}

export default RunnerModule;
