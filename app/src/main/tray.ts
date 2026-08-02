/** 托盘：孵化新角色 / 切换角色 / 设置 / 退出 */
import { Menu, Tray, app, nativeImage } from 'electron';
import path from 'node:path';
import { listCharacters } from './characters';
import { getSettings, setSettings } from './config';
import { createHatchWindow, broadcastCharacterActivated } from './windows';
import { toggleClaudeHooks } from './hooks/claude';
import { getCharacter } from './characters';

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
  const characters = (await listCharacters()).filter((c) => c.manifest);
  const settings = await getSettings();
  const menu = Menu.buildFromTemplate([
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
    {
      label: '设置…',
      click: () => createHatchWindow('settings'),
    },
    { type: 'separator' },
    { label: '退出 QBot', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}
