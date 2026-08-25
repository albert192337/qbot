/** 托盘：孵化新角色 / 切换角色 / Claude 联动 / 公共房间 / 设置 / 退出 */
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'node:path';
import { listCharacters } from './characters';
import { getSettings, setSettings } from './config';
import { createConsoleWindow, createLoungeWindow, broadcastCharacterActivated } from './windows';
import { toggleClaudeHooks } from './hooks/claude';
import { getCharacter } from './characters';
import { notifyRoomCharacterChanged } from './rooms/rooms';

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
 * 菜单按 section 拆分（单一来源，改一处两边生效）：托盘 = character + connect
 * + system；桌宠右键（ipc 'pet:popupMenu'）在前面追加玩宠/窗口两段后拼同样的
 * section——刘海屏 mac 菜单栏挤满时托盘图标被系统静默隐藏，右键是兜底配置入口。
 */

/** 角色管理：「切换角色」radio 列表 + 孵化新角色（换角色/造新角色是同一件事的两个动作） */
export async function characterSection(): Promise<Electron.MenuItemConstructorOptions[]> {
  const characters = (await listCharacters()).filter((c) => c.manifest);
  const settings = await getSettings();
  return [
    {
      label: '切换角色',
      submenu: [
        ...(characters.length
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
                notifyRoomCharacterChanged(); // 公共房间：新形象重新播报给房友（上屏用）
                void rebuildTray();
              },
            }))
          : [{ label: '（暂无角色）', enabled: false }]),
        { type: 'separator' as const },
        { label: '孵化新角色…', click: () => createConsoleWindow('hatch') },
      ],
    },
  ];
}

/** 对外连接：公共房间 + Claude Code 联动 */
export async function connectSection(): Promise<Electron.MenuItemConstructorOptions[]> {
  const settings = await getSettings();
  return [
    {
      label: '公共房间…',
      click: () => createLoungeWindow(),
    },
    {
      // 显式同意入口：点击弹确认框，绝不静默改 ~/.claude/settings.json
      label: settings.claudeHooksInstalled ? '✓ Claude Code 联动' : '接入 Claude Code 联动…',
      click: async () => {
        const installed = await toggleClaudeHooks(!!settings.claudeHooksInstalled);
        await setSettings({ claudeHooksInstalled: installed });
        void rebuildTray();
      },
    },
  ];
}

/** 系统：设置 + 退出 */
export function systemSection(): Electron.MenuItemConstructorOptions[] {
  return [
    {
      label: '控制台…',
      click: () => createConsoleWindow(),
    },
    {
      label: '设置…',
      click: () => createConsoleWindow('settings'),
    },
    { label: '退出 QBot', click: () => app.quit() },
  ];
}

export async function buildMenuTemplate(): Promise<Electron.MenuItemConstructorOptions[]> {
  return [
    ...(await characterSection()),
    { type: 'separator' },
    ...(await connectSection()),
    { type: 'separator' },
    ...systemSection(),
  ];
}
