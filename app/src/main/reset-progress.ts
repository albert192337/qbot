import { app, dialog, type BrowserWindow } from 'electron';
import { requestProgressReset } from './reset-progress-storage';
let showing = false;
export async function confirmProgressReset(owner: BrowserWindow): Promise<void> {
    if (showing || owner.isDestroyed()) return;
    showing = true;
    try {
        const answer = await dialog.showMessageBox(owner, {
            type: 'warning', title: '养成从头开始', message: '重置本机全部养成进度？',
            detail: '将重置花园土地、种子、果实、花园币、图鉴、旅行与角色成长，以及积分、宝箱、家具和房间摆放，恢复新手初始资源。\n\n保留角色素材、聊天、记忆、好友和其他设置。联机账号数据不会清除，重启后会切回本地花园。\n\n重置前会保存完整养成备份，然后正常重启桌宠。',
            buttons: ['取消', '备份并从头开始'], defaultId: 0, cancelId: 0, noLink: true,
        });
        if (answer.response !== 1) return;
        await requestProgressReset(app.getPath('userData'));
        app.relaunch(); app.quit();
    } catch (e) {
        await dialog.showMessageBox({ type: 'error', message: '未能安排重置', detail: String(e) });
    } finally { showing = false; }
}
