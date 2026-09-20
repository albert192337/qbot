import type { SteamApi, SteamSnapshot } from '../../shared/steam';

const states: Record<number, string> = { 0: '离线', 1: '在线', 2: '忙碌', 3: '离开', 4: '暂离', 5: '想交易', 6: '想一起玩' };
export function mountSteam(host: HTMLElement, banner: HTMLElement, api: SteamApi, toast: (text: string) => void, joined: () => Promise<void>): () => void {
  let state: SteamSnapshot | undefined;
  let busy = false;
  let disposed = false;
  let revision = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const sending = new Set<string>();
  const read = async (refresh = false) => {
    const at = revision;
    const next = await (refresh ? api.refresh() : api.get());
    if (!disposed && at === revision) { state = next; revision++; render(); }
  };
  const act = async (work: () => Promise<void>) => {
    if (busy || disposed) return;
    busy = true; render();
    try { await work(); } catch (error) { if (!disposed) toast(String(error)); }
    finally { busy = false; render(); }
  };
  const button = (text: string, work: () => Promise<void>, disabled = false) => {
    const el = document.createElement('button'); el.textContent = text; el.disabled = disabled || busy;
    el.onclick = () => { void act(work); }; return el;
  };
  const text = (tag: string, value: string) => { const el = document.createElement(tag); el.textContent = value; return el; };
  function render() {
    if (disposed) return;
    host.replaceChildren(); banner.replaceChildren(); banner.hidden = !state?.pendingJoin;
    if (!state) { host.append(text('p', '正在读取 Steam 连接状态…')); return; }
    const heading = document.createElement('div'); heading.className = 'section-heading';
    heading.append(text('h3', 'Steam 好友'), button(state.phase === 'ready' ? '刷新好友' : '重新连接', () => read(true)));
    host.append(heading, text('strong', state.label), text('p', state.reason));
    if (state.self) {
      const self = document.createElement('div'); self.className = 'steam-self';
      self.append(text('span', `当前玩家：${state.self.name}`)); host.append(self);
    }
    if (state.phase === 'ready') {
      const help = text('p', state.canInvite ? '邀请会通过 Steam 发给朋友，对方接受后可加入当前房间。' : '先打开一间小屋，再邀请 Steam 好友来玩。');
      help.className = 'muted'; host.append(help);
      const list = document.createElement('div'); list.className = 'steam-friends';
      const friends = [...state.friends].sort((a, b) => Number(b.state !== 0) - Number(a.state !== 0) || a.name.localeCompare(b.name));
      for (const friend of friends) {
        const row = document.createElement('div'); row.className = 'steam-friend'; row.dataset.steamId = friend.steamId;
        if (friend.avatar?.startsWith('data:image/png;base64,')) {
          const image = document.createElement('img'); image.src = friend.avatar; image.alt = ''; row.append(image);
        } else { const icon = text('span', friend.name.slice(0, 1) || '友'); icon.className = 'avatar-dot'; row.append(icon); }
        const info = document.createElement('div'); info.className = 'steam-friend-info';
        info.append(text('strong', friend.name), text('small', states[friend.state] || '状态未知')); row.append(info);
        row.append(button(sending.has(friend.steamId) ? '已邀请' : '邀请', async () => {
          await api.invite(friend.steamId);
          if (disposed) return;
          sending.add(friend.steamId); toast('邀请已交给 Steam，等待朋友接受');
          const timer = setTimeout(() => { timers.delete(timer); sending.delete(friend.steamId); render(); }, 10000);
          timers.add(timer);
        }, !state.canInvite || sending.has(friend.steamId)));
        list.append(row);
      }
      if (!friends.length) list.append(text('p', '当前 Steam 账号还没有可显示的好友。'));
      host.append(list);
    }
    const pending = state.pendingJoin;
    if (pending) {
      const inviter = state.friends.find(f => f.steamId === pending.fromSteamId)?.name;
      banner.append(text('strong', inviter ? `${inviter} 邀请你来玩` : '收到 Steam 加入请求'), text('p', `房间 ${pending.roomId} · 邀请两分钟内有效`));
      banner.append(button('加入房间', async () => { await api.accept(pending.id); await read(); if (!disposed && !state?.pendingJoin) await joined(); }),
        button('暂不加入', async () => { await api.dismiss(pending.id); await read(); }));
    }
  }
  const off = api.onChanged(next => { if (!disposed) { state = next; revision++; render(); } });
  void read().catch(error => { if (!disposed) toast(String(error)); });
  render(); return () => { disposed = true; off(); for (const timer of timers) clearTimeout(timer); timers.clear(); };
}
