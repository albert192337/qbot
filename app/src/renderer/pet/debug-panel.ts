/**
 * 调试面板：状态显示 + 事件日志 + 快捷按钮。
 * 入口在桌宠右键菜单「调试面板」（toggle），不占屏幕常驻元素。
 * 纯 DOM，不碰主逻辑。
 */

export interface DebugState {
  petState: string;
  visitActive: boolean;
  visitorName?: string;
  exchangeRound?: string; // e.g. "2/3"
  turn?: string;          // "宿主" | "访客"
  lastUtterance?: string;
  lastMood?: string;
  currentCharacter?: string;
}

export interface CharacterInfo {
  dirId: string;
  name: string;
  isActive: boolean;
}

interface LogEntry {
  time: string;
  msg: string;
}

const MAX_LOG = 50;

export class DebugPanel {
  private container: HTMLElement;
  private stateEl: HTMLElement;
  private charListEl: HTMLElement;
  private logEl: HTMLElement;
  private visible = false;
  private entries: LogEntry[] = [];

  /** 外部注入的回调 */
  onTriggerVisit?: () => void;
  onEndVisit?: () => void;
  onDeleteCharacter?: (dirId: string) => void;
  onActivateCharacter?: (dirId: string) => void;
  onShowSignboard?: (text: string) => void;
  onHideSignboard?: () => void;

  /** 最近一次发言内容（供外部 setState 读取） */
  lastUtterance = '';
  lastMood = '';

  constructor() {
    // ── 面板主体 ──
    this.container = document.createElement('div');
    this.container.id = 'debug-panel';

    // 按钮行
    const btns = document.createElement('div');
    btns.className = 'debug-btns';

    const triggerBtn = document.createElement('button');
    triggerBtn.textContent = '触发串门';
    triggerBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onTriggerVisit?.();
    });

    const endBtn = document.createElement('button');
    endBtn.textContent = '结束串门';
    endBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onEndVisit?.();
    });

    const clearBtn = document.createElement('button');
    clearBtn.textContent = '清日志';
    clearBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.clearLog();
    });

    const closeBtn = document.createElement('button');
    closeBtn.textContent = '✕ 关闭';
    closeBtn.style.marginLeft = 'auto';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hide();
    });

    btns.appendChild(triggerBtn);
    btns.appendChild(endBtn);
    btns.appendChild(clearBtn);
    btns.appendChild(closeBtn);
    this.container.appendChild(btns);

    // 举牌控制行
    const signRow = document.createElement('div');
    signRow.className = 'debug-btns';
    const signInput = document.createElement('input');
    signInput.type = 'text';
    signInput.placeholder = '牌子文字...';
    signInput.style.cssText = 'flex:1;padding:2px 4px;font-size:10px;font-family:inherit;'
      + 'background:rgba(255,255,255,0.08);color:#ccc;border:1px solid rgba(255,255,255,0.18);border-radius:3px;outline:none';
    signInput.addEventListener('pointerdown', (e) => e.stopPropagation());
    signRow.appendChild(signInput);

    const showSignBtn = document.createElement('button');
    showSignBtn.textContent = '举牌';
    showSignBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onShowSignboard?.(signInput.value || '早点下班');
    });
    signRow.appendChild(showSignBtn);

    const hideSignBtn = document.createElement('button');
    hideSignBtn.textContent = '收牌';
    hideSignBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.onHideSignboard?.();
    });
    signRow.appendChild(hideSignBtn);

    this.container.appendChild(signRow);

    // 角色管理区
    this.charListEl = document.createElement('div');
    this.charListEl.className = 'debug-chars';
    this.container.appendChild(this.charListEl);

    // 状态行
    this.stateEl = document.createElement('div');
    this.stateEl.className = 'debug-state';
    this.container.appendChild(this.stateEl);

    // 日志区
    this.logEl = document.createElement('div');
    this.logEl.className = 'debug-log';
    this.container.appendChild(this.logEl);

    // 阻止面板上的事件冒泡到 stage（防止误拖拽）
    this.container.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.container.addEventListener('pointerup', (e) => e.stopPropagation());

    document.body.appendChild(this.container);
  }

  setState(s: DebugState): void {
    const lines: string[] = [];
    lines.push(`状态: <b>${s.petState}</b>`);
    if (s.visitActive) {
      lines.push(`串门: 活跃`);
      lines.push(`访客: ${s.visitorName ?? '—'}`);
      lines.push(`回合: ${s.exchangeRound ?? '—'}  轮到: ${s.turn ?? '—'}`);
    } else {
      lines.push(`串门: 空闲`);
    }
    if (s.lastUtterance) {
      lines.push(`上次发言: "${s.lastUtterance}" (${s.lastMood ?? '—'})`);
    }
    this.stateEl.innerHTML = lines.join('<br>');
  }

  log(msg: string): void {
    const now = new Date();
    const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    this.entries.push({ time, msg });
    if (this.entries.length > MAX_LOG) this.entries.shift();
    this.renderLog();
  }

  updateCharacterList(chars: CharacterInfo[]): void {
    let html = '<b>角色管理</b><br>';
    for (const c of chars) {
      const marker = c.isActive ? ' ★' : '';
      html += `<span class="debug-char-row">${esc(c.name)}${marker}`;
      html += ` <button class="debug-char-btn" data-action="switch" data-id="${esc(c.dirId)}">切换</button>`;
      html += ` <button class="debug-char-btn debug-char-del" data-action="delete" data-id="${esc(c.dirId)}">✕</button>`;
      html += '</span><br>';
    }
    this.charListEl.innerHTML = html;

    this.charListEl.querySelectorAll('button[data-action="switch"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        if (id) this.onActivateCharacter?.(id);
      });
    });
    this.charListEl.querySelectorAll('button[data-action="delete"]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const id = (btn as HTMLElement).dataset.id;
        const name = (btn as HTMLElement).closest('.debug-char-row')?.textContent?.trim();
        if (id && confirm(`确定删除角色 "${name}"？此操作不可恢复。`)) {
          this.onDeleteCharacter?.(id);
        }
      });
    });
  }

  onSpeak(text: string, mood: string): void {
    this.lastUtterance = text;
    this.lastMood = mood;
    this.log(`说话: "${text}" (${mood})`);
  }

  private clearLog(): void {
    this.entries = [];
    this.renderLog();
  }

  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }

  private show(): void {
    this.visible = true;
    this.container.style.display = 'block';
    document.body.classList.add('has-debug-panel');
  }

  private hide(): void {
    this.visible = false;
    this.container.style.display = 'none';
    document.body.classList.remove('has-debug-panel');
  }

  private renderLog(): void {
    this.logEl.innerHTML = this.entries
      .map((e) => `<span class="debug-log-time">${e.time}</span> ${esc(e.msg)}`)
      .join('<br>');
    this.logEl.scrollTop = this.logEl.scrollHeight;
  }
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
