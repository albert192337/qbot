/** 主进程入口：协议注册（必须在 ready 前）→ 预置角色 → 窗口/托盘/IPC */
import { app, net, protocol, screen } from 'electron';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { charactersDir, getCharacter, listCharacters, seedPresets } from './characters';
import { getSettings, setSettings } from './config';
import { registerIpc } from './ipc';
import { rebuildTray } from './tray';
import { createPetWindow, getPetWindow, setPetScale, syncBubbleBounds } from './windows';
import { startAgentServer } from './agent-server';
import { startMusicMonitor, stopMusicMonitor } from './music-monitor';
import { setLinkStatusListener, stopLink, createLinkRoom, joinLinkRoom, notifyActiveCharacterChanged } from './link/link';

// qbot-asset://<dirId>/<relPath> → userData/characters/<dirId>/<relPath>
// stream: true 缺失时 <video> 对协议 URL 静默不播（必须 ready 前注册）
protocol.registerSchemesAsPrivileged([
  {
    scheme: 'qbot-asset',
    privileges: { stream: true, supportFetchAPI: true, bypassCSP: true },
  },
]);

// 多开支持：QBOT_USER_DATA 指定独立数据目录（单实例锁按 userData 隔离，
// 各实例有自己的角色库/配置/托盘 → 桌面同时养多只）
if (process.env.QBOT_USER_DATA) {
  app.setPath('userData', path.resolve(process.env.QBOT_USER_DATA));
}

// 桌宠常驻单实例
if (!app.requestSingleInstanceLock()) {
  app.quit();
}

app.whenReady().then(async () => {
  protocol.handle('qbot-asset', (req) => {
    const url = new URL(req.url);
    const base = charactersDir();
    const full = path.normalize(
      path.join(base, url.hostname, decodeURIComponent(url.pathname)),
    );
    if (!full.startsWith(base + path.sep) || !existsSync(full)) {
      return new Response('not found', { status: 404 });
    }
    return net.fetch(pathToFileURL(full).toString());
  });

  if (process.platform === 'darwin') app.dock?.hide();

  // 工作区变化（拔显示器/改分辨率）后气泡的边界钳制要重算
  screen.on('display-metrics-changed', syncBubbleBounds);
  screen.on('display-removed', syncBubbleBounds);

  registerIpc();
  await seedPresets();
  // 联机状态变化 → 托盘标签刷新（在这接线避免 link ↔ tray 循环 import）
  setLinkStatusListener(() => void rebuildTray());
  // dev 自动联机（QBOT_USER_DATA 双实例验证用；正常入口是托盘菜单）
  if (process.env.QBOT_LINK_CREATE) {
    void createLinkRoom()
      .then((code) => console.log('[link] room code:', code))
      .catch((err) => console.error('[link] create failed:', err));
  } else if (process.env.QBOT_LINK_JOIN) {
    void joinLinkRoom(process.env.QBOT_LINK_JOIN)
      .then(() => console.log('[link] joined'))
      .catch((err) => console.error('[link] join failed:', err));
  }
  await rebuildTray();
  void startAgentServer(); // agent 联动状态服务（失败不阻塞桌宠本体）
  startMusicMonitor(); // 网易云音乐播放监控（Windows only，失败不阻塞）

  // 启动即上桌：优先上次激活的角色，否则第一只可用角色
  const settings = await getSettings();
  if (settings.petScale) setPetScale(settings.petScale);
  const characters = (await listCharacters()).filter((c) => c.manifest);
  const initial =
    characters.find((c) => c.dirId === settings.activeCharacter) ?? characters[0];
  const pet = createPetWindow();
  if (initial) {
    await setSettings({ activeCharacter: initial.dirId });
    // 首启数据目录 + QBOT_LINK_JOIN：配对早于这里的激活，hello 没带上 manifestHash → 补发
    notifyActiveCharacterChanged();
    pet.webContents.once('did-finish-load', async () => {
      pet.webContents.send('characters:activated', await getCharacter(initial.dirId));
    });
  }
});

// 桌宠应用：全部窗口关闭不退出（托盘常驻）
app.on('window-all-closed', () => {
  /* keep alive */
});

// 退出前收掉常驻的 powershell 监控进程，避免留孤儿；联机侧发 bye 让对端立即收窗
app.on('before-quit', () => {
  stopMusicMonitor();
  stopLink();
});

app.on('activate', () => {
  if (!getPetWindow()) createPetWindow();
});
