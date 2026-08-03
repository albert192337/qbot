/** 托盘：孵化新角色 / 切换角色 / Claude 联动 / 联机 / 设置 / 退出 */
import { Menu, Tray, app, clipboard, dialog, nativeImage } from 'electron';
import path from 'node:path';
import { listCharacters } from './characters';
import { getSettings, setSettings } from './config';
import { createHatchWindow, broadcastCharacterActivated } from './windows';
import { toggleClaudeHooks } from './hooks/claude';
import { getCharacter } from './characters';
import { createLinkRoom, getLinkStatus, joinLinkRoom, stopLink, notifyActiveCharacterChanged } from './link/link';

/** 房间码形状（relay 字符集：去易混 0O1I） */
const ROOM_CODE_RE = /^[2-9A-HJ-NP-Z]{6}$/;

let tray: Tray | null = null;

/** mac：16x16 模板图（占位）——深色圆点，setTemplateImage 适配深浅色菜单栏 */
function macTrayIcon(): Electron.NativeImage {
  // 16x16 实心圆 PNG（ffmpeg 预生成）
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAABAAAAAQBPJcTW' +
      'AAAAMklEQVR4nGNgGMzgPxomWyNJBhHSTNAQigwgVjNOQ4aBAaQYghNQbAAxhhANyNZIXwAA' +
      'BnZvkUpxlIEAAAAASUVORK5CYII=',
    'base64',
  );
  const img = nativeImage.createFromBuffer(png);
  img.setTemplateImage(true);
  return img;
}

/** Windows/Linux：template 机制是 mac 独有的，深色圆点在深色任务栏上不可见 → 用彩色吉祥物图 */
function colorTrayIcon(): Electron.NativeImage {
  const p = app.isPackaged
    ? path.join(process.resourcesPath, 'tray-win.png')
    : path.resolve(__dirname, '../../resources/tray-win.png');
  return nativeImage.createFromPath(p);
}

function trayIcon(): Electron.NativeImage {
  return process.platform === 'darwin' ? macTrayIcon() : colorTrayIcon();
}

export async function rebuildTray(): Promise<void> {
  if (!tray) {
    tray = new Tray(trayIcon());
    tray.setToolTip('QBot');
    // Windows 习惯左键单击托盘有反应；mac 上 click 本来就弹菜单，不用管
    if (process.platform !== 'darwin') {
      tray.on('click', () => tray?.popUpContextMenu());
    }
  }
  tray.setContextMenu(Menu.buildFromTemplate(await buildMenuTemplate()));
}

/**
 * 托盘与桌宠右键「更多」共用的菜单模板（单一来源，改一处两边生效）。
 * 桌宠右键经 ipc 'pet:popupMenu' 以原生子菜单内嵌——刘海屏 mac 菜单栏
 * 挤满时托盘图标被系统静默隐藏，右键是兜底配置入口。
 */
export async function buildMenuTemplate(): Promise<Electron.MenuItemConstructorOptions[]> {
  const characters = (await listCharacters()).filter((c) => c.manifest);
  const settings = await getSettings();
  return [
    {
      label: '孵化新角色…',
      click: () => createHatchWindow(),
    },
    {
      label: '切换角色',
      submenu: characters.length
        ? characters.map((c) => ({
            // 「未命名」会撞名 → 补 dirId 前缀区分
            label:
              !c.manifest.name || c.manifest.name === '未命名'
                ? `未命名（${c.dirId.slice(0, 8)}）`
                : c.manifest.name,
            type: 'radio' as const,
            checked: settings.activeCharacter === c.dirId,
            click: async () => {
              await setSettings({ activeCharacter: c.dirId });
              const meta = await getCharacter(c.dirId);
              if (meta) broadcastCharacterActivated(meta);
              notifyActiveCharacterChanged(); // 联机中：新形象重新 hello 给对端
              void rebuildTray();
            },
          }))
        : [{ label: '（暂无角色）', enabled: false }],
    },
    { type: 'separator' },
    {
      // 显式同意入口：点击弹确认框，绝不静默改 ~/.claude/settings.json
      label: settings.claudeHooksInstalled ? '✓ Claude Code 联动' : '接入 Claude Code 联动…',
      click: async () => {
        const installed = await toggleClaudeHooks(!!settings.claudeHooksInstalled);
        await setSettings({ claudeHooksInstalled: installed });
        void rebuildTray();
      },
    },
    linkMenuItem(),
    {
      label: '设置…',
      click: () => createHatchWindow('settings'),
    },
    { type: 'separator' },
    { label: '退出 QBot', click: () => app.quit() },
  ];
}

/**
 * 「联机」菜单（spec 2026-08-02 §一）：房间码走剪贴板收发，L0 不做输入 UI。
 * 状态变化（配对/掉线）由 link.ts 的 statusListener 触发 rebuildTray 刷新标签。
 */
function linkMenuItem(): Electron.MenuItemConstructorOptions {
  const link = getLinkStatus();
  const label =
    link.phase === 'paired'
      ? `✓ 联机中${link.peerName ? ` · ${link.peerName}` : ''}`
      : link.phase === 'waiting'
        ? `联机 · 等对方加入（${link.roomCode}）`
        : link.phase === 'connecting'
          ? '联机 · 连接中…'
          : '联机';
  if (link.phase === 'off') {
    return {
      label,
      submenu: [
        {
          label: '创建房间（房间码进剪贴板）',
          click: async () => {
            try {
              const code = await createLinkRoom();
              clipboard.writeText(code);
              void dialog.showMessageBox({
                type: 'info',
                message: `房间码：${code}`,
                detail: '已复制到剪贴板。发给好友，对方在托盘选「从剪贴板加入房间」。',
              });
            } catch (err) {
              void dialog.showMessageBox({
                type: 'error',
                message: '联机服务器连不上',
                detail: String(err instanceof Error ? err.message : err),
              });
            }
          },
        },
        {
          label: '从剪贴板加入房间',
          click: async () => {
            const code = clipboard.readText().trim().toUpperCase();
            if (!ROOM_CODE_RE.test(code)) {
              void dialog.showMessageBox({
                type: 'warning',
                message: '剪贴板里没有房间码',
                detail: '先复制好友发来的 6 位房间码，再点这里。',
              });
              return;
            }
            try {
              await joinLinkRoom(code);
            } catch (err) {
              void dialog.showMessageBox({
                type: 'error',
                message: `加入房间 ${code} 失败`,
                detail: String(err instanceof Error ? err.message : err),
              });
            }
          },
        },
      ],
    };
  }
  return {
    label,
    submenu: [
      ...(link.roomCode
        ? [{ label: '复制房间码', click: () => clipboard.writeText(link.roomCode ?? '') }]
        : []),
      { label: '断开联机', click: () => stopLink() },
    ],
  };
}
