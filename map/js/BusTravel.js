/**
 * 巴士传送系统
 *
 * 校园卡乘车、扣除车费、累计次数解锁成就。
 * 扩展：巴士动画、等待时间等可通过 EventBus 订阅实现。
 */

import { EventBus } from './EventBus.js';
import { mapData } from './MapData.js';
import { character } from './Character.js';
import { BUS_ROUTES, BUS_PROXIMITY, BUS_FARE } from './config.js';
import { ErrorCode } from '../../game/js/core/ErrorCode.js';

const SAVE_KEY = 'hust_world_save_v1';
const BUS_ACHIEVEMENT_RIDE_COUNT = 10;

class BusTravel {
  constructor() {
    this.nearbyStop = null;
    this.panelVisible = false;
  }

  _loadSnapshot() {
    if (typeof localStorage === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  _saveSnapshot(snapshot) {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  }

  _getSaveManager() {
    if (typeof window !== 'undefined' && window.saveManager) return window.saveManager;
    return null;
  }

  _getMoney() {
    const sm = this._getSaveManager();
    if (sm) {
      const stats = sm.getStats();
      return Number(stats.money ?? stats.character?.money ?? 0);
    }
    const snapshot = this._loadSnapshot();
    return Number(snapshot?.character?.money ?? snapshot?.progress?.stats?.money ?? 0);
  }

  _setMoney(amount) {
    const snapshot = this._loadSnapshot();
    if (!snapshot) return;
    if (snapshot.character) snapshot.character.money = amount;
    if (snapshot.progress && snapshot.progress.stats) snapshot.progress.stats.money = amount;
    this._saveSnapshot(snapshot);
    const sm = this._getSaveManager();
    if (sm && typeof sm.applySnapshot === 'function') {
      try { sm.applySnapshot(snapshot); } catch (e) { /* 忽略 */ }
    }
  }

  _hasCampusCard() {
    const snapshot = this._loadSnapshot();
    if (!snapshot) return false;
    const items = snapshot.progress?.items || snapshot.items || {};
    return (items.hust_card || 0) > 0;
  }

  _getBusRideCount() {
    const snapshot = this._loadSnapshot();
    return Number(snapshot?.progress?.busRideCount || 0);
  }

  _setBusRideCount(count) {
    const snapshot = this._loadSnapshot();
    if (!snapshot) return;
    if (!snapshot.progress) snapshot.progress = {};
    snapshot.progress.busRideCount = count;
    this._saveSnapshot(snapshot);
  }

  _grantAchievement(achievementId) {
    const snapshot = this._loadSnapshot();
    if (!snapshot) return;
    if (!snapshot.progress) snapshot.progress = {};
    const achievements = snapshot.progress.achievements || [];
    if (!achievements.includes(achievementId)) {
      achievements.push(achievementId);
      snapshot.progress.achievements = achievements;
      this._saveSnapshot(snapshot);
      EventBus.emit('achievement:unlock', { achievementId, source: 'bus' });
    }
  }

  /** 检查角色是否靠近巴士站 */
  checkProximity() {
    const ch = character.getPos();
    const stops = mapData.getLocationsByType('bus_stop');
    let nearest = null, minDistSq = BUS_PROXIMITY * BUS_PROXIMITY;

    for (const stop of stops) {
      const dx = stop.x - ch.x;
      const dy = stop.y - ch.y;
      const distSq = dx * dx + dy * dy;
      if (distSq < minDistSq) { minDistSq = distSq; nearest = stop; }
    }

    const changed = this.nearbyStop?.map_id !== nearest?.map_id;
    this.nearbyStop = nearest;
    if (changed) {
      EventBus.emit('bus:proximity', { stop: nearest });
    }
    return nearest;
  }

  /** 获取经过某个巴士站的线路 */
  getRoutesForStop(stopMapId) {
    return BUS_ROUTES.filter(r => r.stops.includes(stopMapId));
  }

  /** 乘坐巴士到目标站 */
  takeBus(destMapId) {
    const from = this.nearbyStop;
    const to = mapData.getLocationById(destMapId);
    if (!to || !from) return false;

    if (!this._hasCampusCard()) {
      EventBus.emit('bus:error', { reason: ErrorCode.BUS_NO_CARD.code, message: ErrorCode.BUS_NO_CARD.message });
      return false;
    }

    const money = this._getMoney();
    if (money < BUS_FARE) {
      EventBus.emit('bus:error', { reason: ErrorCode.BUS_NO_MONEY.code, message: `余额不足，校车票价 ${BUS_FARE} 元。` });
      return false;
    }

    this._setMoney(money - BUS_FARE);
    character.teleport(to.x, to.y);

    const rideCount = this._getBusRideCount() + 1;
    this._setBusRideCount(rideCount);
    if (rideCount === 1) {
      this._grantAchievement('first_bus_ride');
    }
    if (rideCount >= BUS_ACHIEVEMENT_RIDE_COUNT) {
      this._grantAchievement('bus_regular');
    }

    EventBus.emit('bus:take', { from, to, fare: BUS_FARE, rideCount });
    this.hidePanel();
    return true;
  }

  togglePanel() {
    if (!this.nearbyStop) return;
    if (this.panelVisible) this.hidePanel();
    else this.showPanel();
  }

  showPanel() {
    if (!this.nearbyStop) return;
    this.panelVisible = true;
    EventBus.emit('bus:panel:show', { stop: this.nearbyStop });
  }

  hidePanel() {
    this.panelVisible = false;
    EventBus.emit('bus:panel:hide', {});
  }

  getNearbyStop() { return this.nearbyStop; }
  isPanelVisible() { return this.panelVisible; }
}

export const busTravel = new BusTravel();
