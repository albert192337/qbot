/**
 * 联机 pane：建房 / 加入 / 断开，实时链路状态。
 * 自托盘 linkMenuItem 迁入（阶段 6）。
 *
 * 顺带去掉「房间码只能走剪贴板」的 L0 妥协：托盘菜单没法做输入框，
 * 只能让对方复制房间码再从菜单点「用剪贴板房间码加入」；这里直接给输入框。
 */
import type { LinkStatus } from '../../../shared/ipc-types';
import { toast } from './_studio-shared';

/** 房间码形状（relay 字符集：去易混 0O1I）。
 *  主进程 tray.ts 有同款常量——renderer 不能 import 主进程模块，本地重声明。 */
const ROOM_CODE_RE = /^[2-9A-HJ-NP-Z]{6}$/;

let root: HTMLElement | null = null;
let unsubLink: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  host.innerHTML = `
<div class="studio-body">
  <h2>联机</h2>
  <p class="studio-hint">两台机器的桌宠互相看见：对方的角色会出现在你桌面上，
  举牌和状态实时同步。中转服务器只盲转数据，不存内容。</p>

  <div class="conn-card">
    <div class="conn-row">
      <span class="conn-label">当前状态</span>
      <span id="link-state" class="conn-value">—</span>
    </div>
    <div id="link-code-row" class="conn-row" hidden>
      <span class="conn-label">房间码</span>
      <span id="link-code" class="conn-code">------</span>
      <button id="link-copy" class="btn ghost">复制</button>
    </div>
    <div id="link-actions" class="btn-row"></div>
  </div>

  <div id="link-join-box" class="conn-card">
    <h3>加入好友的房间</h3>
    <div class="conn-row">
      <input id="link-join-code" type="text" placeholder="6 位房间码" maxlength="6" />
      <button id="link-join" class="btn">加入</button>
    </div>
    <p class="studio-hint">房间码不区分大小写，会自动转成大写。</p>
  </div>
</div>`;

  bind(host);
  render(await window.qbot.link.getStatus());
  unsubLink?.();
  unsubLink = window.qbot.link.onChanged(render);
}

export function unmount(): void {
  unsubLink?.();
  unsubLink = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  render(await window.qbot.link.getStatus());
}

function bind(host: HTMLElement): void {
  host.querySelector<HTMLButtonElement>('#link-copy')?.addEventListener('click', () => {
    const code = host.querySelector<HTMLElement>('#link-code')?.textContent ?? '';
    if (code && code !== '------') {
      void navigator.clipboard.writeText(code);
      toast(host, `房间码 ${code} 已复制，发给好友即可`);
    }
  });

  const joinInput = host.querySelector<HTMLInputElement>('#link-join-code')!;
  const doJoin = async (): Promise<void> => {
    const code = joinInput.value.trim().toUpperCase();
    if (!ROOM_CODE_RE.test(code)) {
      toast(host, '房间码是 6 位字母数字（不含 0/O/1/I）', 'warn');
      return;
    }
    try {
      await window.qbot.link.join(code);
      toast(host, `正在加入 ${code}…`);
      joinInput.value = '';
    } catch (err) {
      toast(host, `加入失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
    }
  };
  host.querySelector<HTMLButtonElement>('#link-join')?.addEventListener('click', () => void doJoin());
  joinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') void doJoin();
  });
}

function render(status: LinkStatus): void {
  const host = root;
  if (!host) return;
  const stateEl = host.querySelector<HTMLElement>('#link-state')!;
  const codeRow = host.querySelector<HTMLElement>('#link-code-row')!;
  const codeEl = host.querySelector<HTMLElement>('#link-code')!;
  const actions = host.querySelector<HTMLElement>('#link-actions')!;
  const joinBox = host.querySelector<HTMLElement>('#link-join-box')!;

  const labels: Record<LinkStatus['phase'], string> = {
    off: '未联机',
    connecting: '连接中…',
    waiting: '等对方加入',
    paired: status.peerName ? `已连上 · ${status.peerName}` : '已连上',
  };
  stateEl.textContent = labels[status.phase];
  stateEl.classList.toggle('ok', status.phase === 'paired');

  codeRow.hidden = !status.roomCode;
  if (status.roomCode) codeEl.textContent = status.roomCode;

  actions.replaceChildren();
  if (status.phase === 'off') {
    const create = document.createElement('button');
    create.className = 'btn';
    create.textContent = '创建房间';
    create.addEventListener('click', () => {
      void (async () => {
        create.disabled = true;
        create.textContent = '创建中…';
        try {
          const code = await window.qbot.link.create();
          void navigator.clipboard.writeText(code);
          toast(host, `房间码 ${code} 已复制，发给好友让他加入`);
        } catch (err) {
          toast(host, `联机服务器连不上：${err instanceof Error ? err.message : String(err)}`, 'warn');
          create.disabled = false;
          create.textContent = '创建房间';
        }
      })();
    });
    actions.appendChild(create);
  } else {
    const stop = document.createElement('button');
    stop.className = 'btn danger';
    stop.textContent = '断开联机';
    stop.addEventListener('click', () => {
      window.qbot.link.stop();
      toast(host, '已断开联机');
    });
    actions.appendChild(stop);
  }
  // 已在房间里就别显示加入框（一次只能在一个房间）
  joinBox.hidden = status.phase !== 'off';
}
