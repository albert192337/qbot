/** 主进程入口：协议注册（必须在 ready 前）→ 预置角色 → 窗口/托盘/IPC */
import { app, net, protocol, screen } from 'electron';
import { existsSync } from 'node:fs';
import { open, readFile, stat } from 'node:fs/promises';
import path from 'node:path';

import { initErrorHandler } from './error-handler';
import { charactersDir, getCharacter, listCharacters, seedPresets } from './characters';
import { getSettings, setSettings } from './config';
import { registerIpc } from './ipc';
import { wireRoomPetDisplay } from './rooms/room-pet-display';
import { rebuildTray } from './tray';
import { createPetWindow, getPetWindow, setPetScale, syncBubbleBounds, pushToLounge, broadcastCharacterActivated, getActivePlayables } from './windows';
import { startAgentServer } from './agent-server';
import { startMusicMonitor, stopMusicMonitor } from './music-monitor';
import { startMeetingMonitor, stopMeetingMonitor } from './meeting-monitor';
import { startInputMonitor, stopInputMonitor } from './input-monitor';
import { flushProgress, startProgressTicker, stopProgressTicker } from './progress';
import { createRoom, joinRoom, notifyRoomCharacterChanged, setLoungePush } from './rooms/rooms';
import { emitEvent, flush as flushPerception, setForegroundObservationEnabled, stopFrontAppPolling } from './perception';
import { loadBuiltinRules, setAvailableActionsGetter, wireBehaviorTriggers, stopBehaviorScheduler } from './behavior-rules';
import { startBehaviorExecutor, execute as executeBehavior } from './behavior-executor';
import { setBrainExecutor, wireBrain } from './brain-llm';

/** qbot-asset 响应的 Content-Type（漏了类型 Chromium 会拒绝解码 <video>） */
const ASSET_MIME: Record<string, string> = {
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.gif': 'image/gif',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.json': 'application/json',
};

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
  // 初始化全局错误处理
  initErrorHandler();

  // 资源泄漏检测和自动清理
  startResourceMonitoring();
  protocol.handle('qbot-asset', async (req) => {
    const url = new URL(req.url);
    const base = charactersDir();
    const full = path.normalize(
      path.join(base, url.hostname, decodeURIComponent(url.pathname)),
    );
    if (!full.startsWith(base + path.sep)) {
      return new Response('forbidden', { status: 403 });
    }
    let info;
    try {
      info = await stat(full);
    } catch {
      return new Response('not found', { status: 404 });
    }
    if (!info.isFile()) return new Response('not found', { status: 404 });

    const type = ASSET_MIME[path.extname(full).toLowerCase()] ?? 'application/octet-stream';
    const common = {
      'Content-Type': type,
      'Accept-Ranges': 'bytes',
      // 资产会被重抠/重新生成覆盖，同名同 URL —— 缓存住就会一直显示旧动画
      'Cache-Control': 'no-store',
    };

    // Range 支持：Chromium 媒体栈对 <video> 一定会发 Range，原来 net.fetch(fileURL)
    // 把请求头整个丢了、也不回 206/Accept-Ranges，多路并发时会 MEDIA_ERR_NETWORK
    // → 动作永久停在一帧甚至整个角色空白。
    const range = req.headers.get('Range');
    const m = range ? /^bytes=(\d*)-(\d*)$/.exec(range.trim()) : null;
    if (m && (m[1] || m[2])) {
      const size = info.size;
      const start = m[1] ? Number(m[1]) : 0;
      const end = Math.min(m[2] ? Number(m[2]) : size - 1, size - 1);
      if (!Number.isFinite(start) || start > end || start >= size) {
        return new Response(null, {
          status: 416,
          headers: { ...common, 'Content-Range': `bytes */${size}` },
        });
      }
      const len = end - start + 1;
      const fh = await open(full, 'r');
      try {
        const buf = Buffer.allocUnsafe(len);
        await fh.read(buf, 0, len, start);
        return new Response(buf, {
          status: 206,
          headers: {
            ...common,
            'Content-Length': String(len),
            'Content-Range': `bytes ${start}-${end}/${size}`,
          },
        });
      } finally {
        await fh.close();
      }
    }
    return new Response(await readFile(full), {
      status: 200,
      headers: { ...common, 'Content-Length': String(info.size) },
    });
  });

  if (process.platform === 'darwin') app.dock?.hide();

  // 工作区变化（拔显示器/改分辨率）后气泡的边界钳制要重算
  screen.on('display-metrics-changed', syncBubbleBounds);
  screen.on('display-removed', syncBubbleBounds);

  registerIpc();
  wireRoomPetDisplay(); // 公共房间宠上屏：订阅 room-pets 事件驱动窗口
  await seedPresets();
  // 房间事件 → lounge 窗（rooms.ts 不直接持有窗口引用，同 link ↔ tray 的解耦）
  setLoungePush(pushToLounge);
  // dev 自动进/建公共房间（QBOT_USER_DATA 双/三实例验证宠上屏用；正常入口是托盘/右键菜单）
  if (process.env.QBOT_ROOMS_AUTOJOIN) {
    void joinRoom(process.env.QBOT_ROOMS_AUTOJOIN)
      .then(() => console.log('[rooms] auto-joined:', process.env.QBOT_ROOMS_AUTOJOIN))
      .catch((err) => console.error('[rooms] auto-join failed:', err));
  } else if (process.env.QBOT_ROOMS_AUTOCREATE) {
    void createRoom({ name: process.env.QBOT_ROOMS_AUTOCREATE, kind: 'coop', capacity: 12, listed: true })
      .then((roomId) => console.log('[rooms] auto-created:', roomId))
      .catch((err) => console.error('[rooms] auto-create failed:', err));
  }
  await rebuildTray();
  void startAgentServer(); // agent 联动状态服务（失败不阻塞桌宠本体）
  startMusicMonitor(); // 网易云音乐播放监控（Windows only，失败不阻塞）
  startMeetingMonitor(); // 飞书会议监控（本地日志轮询，失败不阻塞）
  startInputMonitor(); // 键盘敲击计数（Windows only，只数次数不记键位）
  startProgressTicker(); // 挂机计时：满 15 分钟发一个箱子

  // ── 感知层 + 行为规则引擎（桌面行为 spec：事件流 → 规则 → 行为脚本）──
  startBehaviorExecutor(); // DSL 执行器（内部把 execute 注册给规则调度器）
  setBrainExecutor(executeBehavior); // LLM 脑共用同一个执行器
  setAvailableActionsGetter(getActivePlayables); // 激活角色的可播放动作（windows.ts 维护）
  await loadBuiltinRules(); // 内置规则包
  wireBehaviorTriggers(); // 订阅感知事件流 → 规则 trigger 边沿
  wireBrain(); // 自由模式 LLM 脑（内部按 settings.freeMode + arkApiKey 自行门控）
  // 启动即上桌：优先上次激活的角色，否则第一只可用角色
  const settings = await getSettings();
  // 系统前台窗口不能靠 Electron 的 browser-window-focus 判断（它只覆盖本应用窗口）。
  // 标题敏感度高，遵循独立开关、默认关闭；macOS / Windows 分别走原生只读采集器。
  setForegroundObservationEnabled(settings.foregroundObservationEnabled === true);
  if (settings.petScale) setPetScale(settings.petScale);
  const characters = (await listCharacters()).filter((c) => c.manifest);
  const initial =
    characters.find((c) => c.dirId === settings.activeCharacter) ?? characters[0];
  const pet = createPetWindow();
  if (initial) {
    await setSettings({ activeCharacter: initial.dirId });
    // 首启数据目录 + QBOT_ROOMS_AUTOJOIN：进房早于这里的激活，
    // announce 没等到 activeCharacter 落盘 → 补发一次
    notifyRoomCharacterChanged();
    // 走 broadcastCharacterActivated：pet + room 都收到，且主进程同步可用动作缓存。
    // startup 事件必须在角色激活之后发——否则 triggerRules 评估 startup-greeting 时
    // availableActions 还是空的，wave/talk_happy 全降级到不可见的 idle（行为引擎「无反应」根因之一）
    pet.webContents.once('did-finish-load', async () => {
      const meta = await getCharacter(initial.dirId);
      if (meta) broadcastCharacterActivated(meta);
      void emitEvent({ type: 'startup', at: Date.now() });
    });
  } else {
    // 没有任何角色：桌面是空的，但 LLM 脑/规则脑仍应收到启动边沿
    void emitEvent({ type: 'startup', at: Date.now() });
  }
});

// 桌宠应用：全部窗口关闭不退出（托盘常驻）
app.on('window-all-closed', () => {
  /* keep alive */
});

// 退出前收掉常驻的 powershell 监控进程，避免留孤儿；联机侧发 bye 让对端立即收窗
let quitFlushed = false;
app.on('before-quit', (ev) => {
  if (quitFlushed) return; // 下面 app.quit() 会二次进来
  stopMusicMonitor();
  stopMeetingMonitor();
  stopInputMonitor();
  stopFrontAppPolling();
  stopBehaviorScheduler();
  stopProgressTicker();
  // progress 是玩法数据（点数/箱子/库存），不能丢防抖窗口里最后那笔 →
  // 拦一次退出等落盘完再真退。写失败 flushProgress 内部已吞，不会卡住退出
  ev.preventDefault();
  void Promise.all([flushProgress(), flushPerception()]).finally(() => {
    quitFlushed = true;
    app.quit();
  });
});

app.on('activate', () => {
  if (!getPetWindow()) createPetWindow();
});

/**
 * 资源泄漏检测和自动清理
 */
function startResourceMonitoring(): void {
  // 每5分钟检查一次资源使用情况
  setInterval(() => {
    // 检查内存使用
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: (memUsage.rss / 1024 / 1024).toFixed(2),
      heapTotal: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
      heapUsed: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      external: (memUsage.external / 1024 / 1024).toFixed(2),
    };

    console.log('[resource-monitor] 内存使用情况:', memUsageMB);

    // 如果堆内存超过200MB，强制垃圾回收
    if (memUsage.heapUsed > 200 * 1024 * 1024 && global.gc) {
      console.warn('[resource-monitor] 高内存使用警告，强制垃圾回收');
      global.gc();
    }

    // 其他资源清理逻辑可以在这里添加
  }, 5 * 60 * 1000);
}
