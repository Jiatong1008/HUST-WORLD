/**
 * 地图系统功能模块入口
 * 
 * 包含四个核心功能模块：
 * - ClubModule: 社团系统（百团大战、任务、奖励）
 * - NpcModule: NPC交互（自动对话、手动对话）
 * - RunnerModule: 跑酷游戏（双轨道切换）
 * - ExplorationModule: 探索打卡（校园地点探索）
 */

import ClubModule from './club/club.js?v=3';
import NpcModule from './npc/npc.js?v=2';
import RunnerModule from './runner/runner.js';
import ExplorationModule from './exploration/exploration.js';

export {
  ClubModule,
  NpcModule,
  RunnerModule,
  ExplorationModule
};

export default {
  ClubModule,
  NpcModule,
  RunnerModule,
  ExplorationModule
};
