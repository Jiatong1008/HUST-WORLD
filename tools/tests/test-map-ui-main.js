import { UIManager } from '../../map/js/UIManager.js';

const status = document.getElementById('status');
function write(msg, ok) {
  const div = document.createElement('div');
  div.className = ok ? 'pass' : 'fail';
  div.textContent = msg;
  status.appendChild(div);
}

const ui = new UIManager();
const hasHud = !!document.getElementById('hud');
write('UIManager 实例化: ' + (ui ? '成功' : '失败'), !!ui);
write('HUD 容器存在: ' + (hasHud ? '是' : '否'), hasHud);
write('全局 UIManager 模块已加载', true);
