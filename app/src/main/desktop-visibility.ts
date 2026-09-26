import { app, BrowserWindow, ipcMain, screen, Menu } from 'electron';
import { readFileSync, writeFileSync, renameSync } from 'node:fs';
import path from 'node:path';
import type { DesktopHitRect, DesktopVisibility, PeekSide } from '../shared/desktop-visibility';
import { peekSideAtDrop } from '../shared/desktop-visibility';
import { moveFixedSize, fixedWindowSize } from './fixed-window';

type Surface = { kind: 'aux' | 'host' | 'peer' | 'decoration'; member?: string; permitted: boolean; suppressed: boolean; restore: boolean; hostWasVisible: boolean; pendingHostShow: boolean; hits: DesktopHitRect[]; peek: PeekSide };
const surfaces = new Map<BrowserWindow, Surface>();
let hidden = false, revision = 0, initialized = false;
let hiddenMembers = new Set<string>();
let pairedMember: string | undefined;
/** Transient ownership transfer to the host's pair stage, never a saved preference. */
export function setPairedMember(id?: string): void {
  if(pairedMember===id)return;
  const previous=pairedMember;pairedMember=id;
  for(const [win,s] of surfaces)if(s.kind==='peer'&&!win.isDestroyed()){
    if(s.member===id)win.hide();
    else if(s.member===previous)win.showInactive();
  }
  publish();
}
const listeners = new Set<() => void>();
export function onDesktopVisibilityChanged(fn: () => void): () => void { listeners.add(fn); return () => listeners.delete(fn); }
export function desktopHidden(): boolean { return hidden; }
export function desktopQuiet(): boolean { return hidden || [...surfaces.values()].some(s => s.kind === 'host' && s.peek); }
export function memberHidden(id: string): boolean { return hiddenMembers.has(id); }
export function desktopActorVisible(win: BrowserWindow, requireVisible = true): boolean {
  const s=surfaces.get(win);
  return !win.isDestroyed()&&(!requireVisible||win.isVisible())&&!hidden&&!!s&&['host','peer'].includes(s.kind)&&!s.peek&&!(s.member&&(memberHidden(s.member)||s.member===pairedMember));
}
export function desktopSnapshot(win?: BrowserWindow | null): DesktopVisibility {
  return { revision, hidden, hiddenMembers: [...hiddenMembers], peek: win ? surfaces.get(win)?.peek ?? null : null };
}
function allowed(s: Surface): boolean {
  if (s.kind === 'host') return true; // its renderer retains only the toolbar
  if (s.kind === 'peer') return !hidden&&s.member!==pairedMember; // paired actors move into the shared stage
  if (s.kind === 'decoration' && desktopQuiet() && !s.permitted) return false;
  if(s.kind==='aux'&&s.suppressed&&!s.permitted)return false;
  return !hidden || s.permitted;
}
function publish(): void {
  revision++;
  for (const [win,s] of surfaces) if (!win.isDestroyed()) {
    win.webContents.setAudioMuted(hidden || !!s.peek || (s.kind === 'peer' && (memberHidden(s.member!)||s.member===pairedMember)));
    win.webContents.send('desktop:changed', desktopSnapshot(win));
  }
  for (const fn of listeners) fn();
}
/** Guard the actual display calls, including late ready-to-show callbacks. All callers keep their normal API. */
export function trackDesktopWindow(win: BrowserWindow, kind: Surface['kind'] = 'aux', member?: string): void {
  const existing = surfaces.get(win);
  if (existing) { existing.kind = kind; existing.member = member;if(!allowed(existing))win.hide();win.webContents.setAudioMuted(hidden||(kind==='peer'&&(memberHidden(member!)||member===pairedMember)));return; }
  const state: Surface = {kind, member, permitted:false, suppressed:hidden, restore:false, hostWasVisible:true, pendingHostShow:false, hits:[], peek:null};
  surfaces.set(win, state);
  for (const method of ['show','showInactive','restore'] as const) {
    const original = win[method].bind(win);
    win[method] = () => { if (!win.isDestroyed() && allowed(state)) original(); };
  }
  win.webContents.setAudioMuted(hidden||(kind==='peer'&&(memberHidden(member!)||member===pairedMember)));
  win.webContents.on('did-finish-load', () => win.webContents.send('desktop:changed', desktopSnapshot(win)));
  win.once('closed', () => surfaces.delete(win));
}
/** Explicitly opening a panel is allowed, but a later hide revokes this permission. */
export function allowDesktopWindow(win: BrowserWindow | null): void {
  if (!win || win.isDestroyed()) return;
  if (!surfaces.has(win)) trackDesktopWindow(win);
  surfaces.get(win)!.permitted = true;
}
export function setDesktopHidden(value: boolean): void {
  const wasHidden=hidden;
  hidden = value;
  for (const [win,s] of surfaces) {
    if (win.isDestroyed()) continue;
    if (value) {
      if(s.kind==='host'&&!wasHidden){s.hostWasVisible=win.isVisible();s.pendingHostShow=!win.isVisible();}
      s.restore ||= s.kind === 'decoration' && win.isVisible();
      s.permitted = false;s.suppressed=true;
      if (s.kind !== 'host') win.hide();
      win.webContents.send('bubble:clear');
    } else if(s.kind==='host') {s.pendingHostShow=false;if(!s.hostWasVisible)win.hide();}
    else if (s.kind === 'peer' || s.restore) { s.restore = false; win.showInactive(); }
  }
  publish();
}
export function setMemberHidden(id: string, value: boolean): void {
  if (!/^(?:[A-Z0-9]{12}|test:[a-zA-Z0-9_.-]{1,160})$/.test(id)) throw Error('无效的房友');
  const next = new Set(hiddenMembers);
  if (value) next.add(id); else next.delete(id);
  const file = path.join(app.getPath('userData'), 'desktop-hidden-members.json');
  writeFileSync(file + '.tmp', JSON.stringify([...next])); renameSync(file + '.tmp', file);
  hiddenMembers = next;
  for (const [win,s] of surfaces) if (s.member === id && !win.isDestroyed()) {
    if(value)s.peek=null;
    win.showInactive();
  }
  publish();
}
export function setWindowPeek(win: BrowserWindow, side: PeekSide): void {
  const s = surfaces.get(win); if (!s || !['host','peer'].includes(s.kind)) return;
  if(s.peek===side)return;
  s.peek = side;
  if (side) {
    const b = win.getBounds(), a = screen.getDisplayMatching(b).workArea;
    const size=fixedWindowSize(win)??{width:b.width,height:b.height};
    moveFixedSize(win, side === 'left' ? a.x : a.x + a.width - size.width,
      Math.max(a.y, Math.min(b.y, a.y + a.height - size.height)), size);
    if (s.kind === 'host') for (const [other, surface] of surfaces) if (surface.kind === 'decoration') other.hide();
  }
  publish();
}
export function windowPeeking(win: BrowserWindow | null): boolean { return !!win && !!surfaces.get(win)?.peek; }
export function registerDesktopVisibility(): void {
  if (initialized) return; initialized = true;
  try { const ids: unknown = JSON.parse(readFileSync(path.join(app.getPath('userData'), 'desktop-hidden-members.json'),'utf8')); if (Array.isArray(ids)) hiddenMembers = new Set(ids.filter(id => typeof id === 'string')); } catch { /* first launch */ }
  app.on('browser-window-created', (_event, win) => trackDesktopWindow(win));
  for (const win of BrowserWindow.getAllWindows()) trackDesktopWindow(win);
  ipcMain.handle('desktop:get', e => desktopSnapshot(BrowserWindow.fromWebContents(e.sender)));
  ipcMain.handle('desktop:toggle', () => { setDesktopHidden(!hidden); return desktopSnapshot(); });
  ipcMain.on('desktop:menu', async event => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) return;
    try {
      const display = await import('./rooms/room-pet-display');
      const rooms = await import('./rooms/rooms');
      if (win.isDestroyed()) return;
      const hasRoom = !!rooms.getRoomsCache().room;
      const roomVisible = display.getRoomDisplayMode() === 'room';
      Menu.buildFromTemplate([
        { label: hidden ? '显示全部角色' : '隐藏全部角色', click: () => setDesktopHidden(!hidden) },
        { label: roomVisible ? '只隐藏房间（保留角色）' : '显示房间背景', enabled: hasRoom,
          click: () => { void display.setRoomDisplayMode(roomVisible ? 'desktop' : 'room').catch(error => console.error('[desktop:menu] room display switch failed', error)); } },
      ]).popup({ window: win });
    } catch (error) { console.error('[desktop:menu]', error); }
  });
  ipcMain.on('desktop:peerControls', e => { for (const [win,s] of surfaces) if (s.kind==='peer' && win.webContents!==e.sender) win.webContents.send('desktop:peerControlsClose'); });
  ipcMain.handle('desktop:member', (_e,id,value) => { if (typeof id !== 'string' || typeof value !== 'boolean') throw Error('无效请求'); setMemberHidden(id,value); });
  ipcMain.handle('desktop:drop', e => {
    const win = BrowserWindow.fromWebContents(e.sender), s = win && surfaces.get(win);
    if (!win || !s || !['host','peer'].includes(s.kind) || hidden) return false;
    const b = win.getBounds(), d = screen.getDisplayMatching(b);
    const side = peekSideAtDrop(b, d.workArea, screen.getAllDisplays().filter(o=>o.id!==d.id).map(o=>o.bounds));
    setWindowPeek(win,side); return !!side;
  });
  ipcMain.on('desktop:unpeek', e => { const win = BrowserWindow.fromWebContents(e.sender); if (win) setWindowPeek(win,null); });
  ipcMain.on('desktop:hits', (e, hits: DesktopHitRect[]) => {
    const win = BrowserWindow.fromWebContents(e.sender), s = win && surfaces.get(win);
    if (!win || !s || !Array.isArray(hits) || hits.length > 32) return;
    s.hits = hits.filter(r=>r && [r.x,r.y,r.width,r.height].every(Number.isFinite) && r.width>0 && r.height>0);
    if(hidden&&s.kind==='host'&&s.pendingHostShow&&s.hits.length){s.pendingHostShow=false;win.showInactive();}
  });
  const timer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    for (const [win,s] of surfaces) if (!win.isDestroyed() && win.isVisible() && ['host','peer'].includes(s.kind)) {
      const restricted = (s.kind==='host' && hidden) || (s.kind==='peer' && memberHidden(s.member!)) || !!s.peek;
      const b = win.getBounds(), x=p.x-b.x, y=p.y-b.y;
      const hit = s.hits.some(r=>x>=r.x && x<=r.x+r.width && y>=r.y && y<=r.y+r.height);
      win.setIgnoreMouseEvents(restricted && !hit,{forward:true});
    }
  }, 60); timer.unref(); app.once('before-quit',()=>clearInterval(timer));
  const recover = () => { for (const [win,s] of surfaces) if (s.peek && !win.isDestroyed()) { const side=s.peek;s.peek=null;setWindowPeek(win,side); } };
  screen.on('display-removed',recover); screen.on('display-metrics-changed',recover);
}
