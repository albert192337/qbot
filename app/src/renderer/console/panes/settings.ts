/**
 * 设置 pane：API key / 桌宠大小 / 语音 / 隐私。自 hatch 的 settings 屏迁入（阶段 5）。
 *
 * 关键改造：统一成**改动即生效**。原实现是混合语义——两个 API key 要点「保存」、
 * 其余四项改动即生效；pane 之间切换会丢未保存的 key。key 走 change 事件
 * （blur 或回车才触发，不会每敲一个字符写一次盘）。
 */
import type { Settings } from '../../../shared/ipc-types';

let root: HTMLElement | null = null;
let unsubSettings: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  const s = await window.qbot.settings.get();
  host.innerHTML = template(s);
  bind(host);

  // 托盘或别的 pane 改了设置 → 同步本页控件（原先 settings:changed 不发给孵化窗）
  unsubSettings?.();
  unsubSettings = window.qbot.settings.onChanged((next) => {
    if (!root) return;
    syncFrom(root, next);
  });
}

export function unmount(): void {
  unsubSettings?.();
  unsubSettings = null;
  root = null;
}

function template(s: Settings): string {
  const scale = s.petScale ?? 1;
  const vol = s.voiceVolume ?? 70;
  return `
<div class="studio-body">
  <h2>设置</h2>

  <h3>API Key</h3>
  <p class="studio-hint">孵化新角色与重新生成动作时使用。改动离开输入框即保存。</p>
  <label for="set-ark-key">火山方舟 Ark API Key</label>
  <input id="set-ark-key" type="password" placeholder="粘贴你的 API Key" value="${attr(s.arkApiKey)}" />
  <label for="set-gpt-key">GPT-Image-2 API Key<span class="studio-hint" style="display:inline;margin-left:6px">选该生图后端时才需要</span></label>
  <input id="set-gpt-key" type="password" placeholder="sk-…" value="${attr(s.gptImageApiKey)}" />

  <h3>桌宠</h3>
  <div class="set-row">
    <span class="set-label">大小 <b id="set-scale-value">${Math.round(scale * 100)}%</b></span>
    <input id="set-scale" type="range" min="0.5" max="2" step="0.1" value="${scale}" />
  </div>

  <h3>语音</h3>
  <div class="set-row">
    <label class="set-check"><input id="set-voice-enabled" type="checkbox" ${s.voiceEnabled ?? true ? 'checked' : ''} /> 开启叽歪语音</label>
  </div>
  <div class="set-row">
    <span class="set-label">音量 <b id="set-volume-value">${vol}</b></span>
    <input id="set-voice-volume" type="range" min="0" max="100" step="5" value="${vol}" />
  </div>
  <div class="set-row">
    <span class="set-label">说话频率</span>
    <select id="set-talk-frequency">
      <option value="quiet"${s.talkFrequency === 'quiet' ? ' selected' : ''}>安静</option>
      <option value="normal"${(s.talkFrequency ?? 'normal') === 'normal' ? ' selected' : ''}>正常</option>
      <option value="chatty"${s.talkFrequency === 'chatty' ? ' selected' : ''}>话痨</option>
    </select>
  </div>

  <h3>行为模式</h3>
  <div class="set-row">
    <label class="set-check"><input id="set-free-mode" type="checkbox" ${s.freeMode ? 'checked' : ''} /> 自由模式（让桌宠用 AI 自主思考）</label>
  </div>
  <p class="studio-hint">关闭时是<b>陪伴模式</b>：桌宠按内置规则行动，完全本地、零花费。
  开启后叠加 <b>LLM 脑</b>：桌宠会调用大模型（用上面的方舟 API Key）自己判断时机、即兴说话做动作，
  约 15 分钟才思考一次，花费极低；规则脑照常保底。没有 Key 时开关不生效。</p>

  <h3>隐私</h3>
  <div class="set-row">
    <label class="set-check"><input id="set-show-pet" type="checkbox" ${s.roomsShowMyPet !== false ? 'checked' : ''} /> 在公共房间展示我的桌宠</label>
  </div>
  <p class="studio-hint">开启后进房会把你的桌宠形象（动作动画，不含人设文字）缓存到房间服务器，供房友桌面显示。关闭则房友只见你的缩略图。
  键盘监控只累计次数，哪个键从不离开本机、不联网、不落盘。
  公共房间只出状态枚举与动作名，曲名/会话内容绝不进房间。</p>
</div>`;
}

function attr(v: string | undefined): string {
  return (v ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/** 外部改动回写控件（不回写 API key：避免把用户正在编辑的内容覆盖掉） */
function syncFrom(host: HTMLElement, s: Settings): void {
  const scale = host.querySelector<HTMLInputElement>('#set-scale');
  if (scale && document.activeElement !== scale) {
    scale.value = String(s.petScale ?? 1);
    host.querySelector('#set-scale-value')!.textContent = `${Math.round((s.petScale ?? 1) * 100)}%`;
  }
  const enabled = host.querySelector<HTMLInputElement>('#set-voice-enabled');
  if (enabled) enabled.checked = s.voiceEnabled ?? true;
  const vol = host.querySelector<HTMLInputElement>('#set-voice-volume');
  if (vol && document.activeElement !== vol) {
    vol.value = String(s.voiceVolume ?? 70);
    host.querySelector('#set-volume-value')!.textContent = String(s.voiceVolume ?? 70);
  }
  const freq = host.querySelector<HTMLSelectElement>('#set-talk-frequency');
  if (freq) freq.value = s.talkFrequency ?? 'normal';
  const showPet = host.querySelector<HTMLInputElement>('#set-show-pet');
  if (showPet) showPet.checked = s.roomsShowMyPet !== false;
  const freeMode = host.querySelector<HTMLInputElement>('#set-free-mode');
  if (freeMode) freeMode.checked = !!s.freeMode;
}

function bind(host: HTMLElement): void {
  const q = <T extends HTMLElement>(sel: string): T => host.querySelector<T>(sel)!;

  // API key：change 而非 input —— 离开输入框/回车才写盘，不会每敲一字符存一次
  q<HTMLInputElement>('#set-ark-key').addEventListener('change', (e) => {
    void window.qbot.settings.set({ arkApiKey: (e.target as HTMLInputElement).value.trim() });
  });
  q<HTMLInputElement>('#set-gpt-key').addEventListener('change', (e) => {
    void window.qbot.settings.set({ gptImageApiKey: (e.target as HTMLInputElement).value.trim() });
  });

  // 拖滑块实时生效（窗口即画布，直接看到大小变化）
  q<HTMLInputElement>('#set-scale').addEventListener('input', (e) => {
    const v = parseFloat((e.target as HTMLInputElement).value);
    q('#set-scale-value').textContent = `${Math.round(v * 100)}%`;
    void window.qbot.settings.set({ petScale: v });
  });

  q<HTMLInputElement>('#set-voice-enabled').addEventListener('change', (e) => {
    void window.qbot.settings.set({ voiceEnabled: (e.target as HTMLInputElement).checked });
  });
  q<HTMLInputElement>('#set-voice-volume').addEventListener('input', (e) => {
    const v = parseInt((e.target as HTMLInputElement).value, 10);
    q('#set-volume-value').textContent = String(v);
    void window.qbot.settings.set({ voiceVolume: v });
  });
  q<HTMLSelectElement>('#set-talk-frequency').addEventListener('change', (e) => {
    void window.qbot.settings.set({
      talkFrequency: (e.target as HTMLSelectElement).value as 'quiet' | 'normal' | 'chatty',
    });
  });
  q<HTMLInputElement>('#set-show-pet').addEventListener('change', (e) => {
    void window.qbot.settings.set({ roomsShowMyPet: (e.target as HTMLInputElement).checked });
  });
  q<HTMLInputElement>('#set-free-mode').addEventListener('change', (e) => {
    void window.qbot.settings.set({ freeMode: (e.target as HTMLInputElement).checked });
  });
}
