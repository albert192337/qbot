/**
 * 我的角色 pane：角色卡片网格，切换 / 重命名 / 删除。
 *
 * 角色删除此前**只有桌宠调试面板一个入口**（IPC 早就有，UI 没了就够不着），
 * 面板删掉后这里是唯一入口。
 */
import type { CharacterMeta } from '../../../shared/ipc-types';
import { confirmBox, esc, toast } from './_studio-shared';

let root: HTMLElement | null = null;
let unsubActivated: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  unsubActivated?.();
  // 别处（托盘/右键）切了角色 → 网格的「使用中」标记跟上
  unsubActivated = window.qbot.characters.onActivated(() => void refresh());
  await refresh();
}

export function unmount(): void {
  unsubActivated?.();
  unsubActivated = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  await refresh();
}

async function refresh(): Promise<void> {
  const host = root;
  if (!host) return;
  const [all, active] = await Promise.all([
    window.qbot.characters.list(),
    window.qbot.characters.getActive(),
  ]);
  const ready = all.filter((c) => c.manifest);

  let html = '<div class="studio-body"><div class="page-heading"><div><p class="eyebrow">角色资产</p><h2>角色库</h2><p class="page-summary">切换当前桌宠，查看动作完整度，或管理本地角色包。</p></div><button id="new-character" class="btn primary">新建角色</button></div>';
  if (ready.length === 0) {
    html += '<div class="pane-placeholder"><b>还没有角色</b><br/>准备一张正面角色图，生成你的第一只桌宠。<div class="btn-row" style="justify-content:center"><button id="empty-new-character" class="btn primary">开始孵化</button></div></div></div>';
    host.innerHTML = html;
    host.querySelector('#empty-new-character')?.addEventListener('click', () => window.qbot.ui.openConsole('hatch'));
    return;
  }
  html += `<p class="studio-hint">点卡片切换当前上桌的角色。</p>`;
  html += '<div class="char-grid">';
  for (const c of ready) {
    const isActive = c.dirId === active?.dirId;
    const name = c.manifest.name && c.manifest.name !== '未命名' ? c.manifest.name : '未命名';
    const doneCount = Object.values(c.manifest.actions).filter((a) => a.status === 'done').length;
    const failed = Object.values(c.manifest.actions).filter((a) => a.status === 'failed').length;
    html += `<div class="char-card${isActive ? ' active' : ''}" data-dir="${esc(c.dirId)}">`;
    html += `<div class="char-thumb"><img src="qbot-asset://${esc(c.dirId)}/source.png" alt="" /></div>`;
    html += `<div class="char-name">${esc(name)}${isActive ? '<span class="char-badge">使用中</span>' : ''}</div>`;
    html += `<div class="char-meta">${doneCount} 个动作${failed ? ` · ${failed} 个失败` : ''}`;
    if (c.hasUnfinishedJob) html += ` · <b>未完成</b>`;
    html += `</div>`;
    html += `<div class="char-btns">`;
    if (!isActive) html += `<button class="btn use-char" data-dir="${esc(c.dirId)}">使用</button>`;
    html += `<button class="btn ghost rename-char" data-dir="${esc(c.dirId)}">改名</button>`;
    html += `<button class="btn danger del-char" data-dir="${esc(c.dirId)}" data-name="${esc(name)}">删除</button>`;
    html += `</div></div>`;
  }
  html += '</div></div>';
  host.innerHTML = html;
  bind(host);
}

function bind(host: HTMLElement): void {
  host.querySelector('#new-character')?.addEventListener('click', () => window.qbot.ui.openConsole('hatch'));
  host.querySelectorAll<HTMLButtonElement>('.use-char').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await window.qbot.characters.activate(btn.dataset.dir!);
      await refresh();
    });
  });

  host.querySelectorAll<HTMLButtonElement>('.rename-char').forEach((btn) => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.char-card')!;
      const nameEl = card.querySelector<HTMLElement>('.char-name')!;
      if (card.querySelector('.rename-input')) return;
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'rename-input';
      input.maxLength = 24;
      input.value = nameEl.textContent?.replace('使用中', '').trim() ?? '';
      const commit = async (): Promise<void> => {
        const v = input.value.trim();
        input.remove();
        if (v) {
          await window.qbot.characters.rename(btn.dataset.dir!, v);
          toast(host, `已改名为「${v}」`);
        }
        await refresh();
      };
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') void commit();
        else if (e.key === 'Escape') input.remove();
      });
      input.addEventListener('blur', () => void commit());
      nameEl.after(input);
      input.focus();
      input.select();
    });
  });

  host.querySelectorAll<HTMLButtonElement>('.del-char').forEach((btn) => {
    btn.addEventListener('click', () => {
      void (async () => {
        const name = btn.dataset.name!;
        const ok = await confirmBox(
          host,
          `删除角色「${name}」？\n\n资产包会从磁盘移除，此操作不可恢复。`,
        );
        if (!ok) return;
        await window.qbot.characters.delete(btn.dataset.dir!);
        toast(host, `已删除「${name}」`);
        await refresh();
      })();
    });
  });
}

/** 供别的 pane 复用的类型出口（避免各自 import CharacterMeta） */
export type { CharacterMeta };
