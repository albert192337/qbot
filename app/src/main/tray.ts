/** 托盘：孵化新角色 / 切换角色 / 设置 / 退出 */
import { Menu, Tray, app, nativeImage } from 'electron';
import { listCharacters } from './characters';
import { getSettings, setSettings } from './config';
import { createHatchWindow, createPetWindow, getPetWindow } from './windows';
import { getCharacter } from './characters';

let tray: Tray | null = null;

/** 16x16 模板图（占位）：深色圆点，Retina 下略糊但可用；正式图标后置 */
function trayIcon(): Electron.NativeImage {
  // 16x16 实心圆 PNG（ffmpeg 预生成），setTemplateImage 适配深浅色菜单栏
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

export async function rebuildTray(): Promise<void> {
  if (!tray) {
    tray = new Tray(trayIcon());
    tray.setToolTip('QBot');
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
              const pet = getPetWindow() ?? createPetWindow();
              pet.webContents.send('characters:activated', meta);
              void rebuildTray();
            },
          }))
        : [{ label: '（暂无角色）', enabled: false }],
    },
    { type: 'separator' },
    {
      label: '设置…',
      click: () => createHatchWindow('settings'),
    },
    { type: 'separator' },
    { label: '退出 QBot', click: () => app.quit() },
  ]);
  tray.setContextMenu(menu);
}
