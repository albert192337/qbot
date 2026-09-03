/** 控制台设置：身份、模型、桌宠、语音、行为、隐私与开发者入口。 */
import type { Settings } from '../../../shared/ipc-types';

let root: HTMLElement | null = null;
let unsubSettings: (() => void) | null = null;

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  const settings = await window.qbot.settings.get();
  host.innerHTML = template(settings);
  bind(host);
  unsubSettings?.();
  unsubSettings = window.qbot.settings.onChanged((next) => {
    if (root) syncFrom(root, next);
  });
}

export function unmount(): void {
  unsubSettings?.();
  unsubSettings = null;
  root = null;
}

export async function onVisible(): Promise<void> {
  if (root) syncFrom(root, await window.qbot.settings.get());
}

function keyRow(id: string, label: string, value: string | undefined, hint: string): string {
  return `<div class="setting-block">
    <div class="setting-copy"><label for="${id}">${label}</label><p>${hint}</p></div>
    <div class="key-control">
      <span class="key-state ${value ? 'configured' : ''}">${value ? '已配置' : '未配置'}</span>
      <input id="${id}" type="password" autocomplete="off" placeholder="${value ? '已保存，输入新值可替换' : '粘贴 API Key'}" value="${attr(value)}" />
      <button class="btn quiet key-reveal" type="button" data-target="${id}">显示</button>
      <button class="btn quiet key-clear" type="button" data-target="${id}">清除</button>
    </div>
  </div>`;
}

function template(settings: Settings): string {
  const scale = settings.petScale ?? 1;
  const volume = settings.voiceVolume ?? 70;
  const nickname = settings.nickname ?? settings.marketNickname ?? '';
  return `<div class="studio-body settings-body">
    <div class="page-heading"><div><p class="eyebrow">系统偏好</p><h2>设置</h2><p class="page-summary">所有修改自动保存。敏感信息只写入本机配置。</p></div></div>

    <section class="settings-section"><h3>身份</h3>
      <div class="setting-block"><div class="setting-copy"><label for="set-nickname">公开昵称</label><p>装扮市场署名与公共房间身份使用同一个昵称。</p></div><input id="set-nickname" type="text" maxlength="24" placeholder="匿名" value="${attr(nickname)}" /></div>
    </section>

    <section class="settings-section"><h3>模型与 API</h3>
      ${keyRow('set-ark-key', '火山方舟 Ark API Key', settings.arkApiKey, '用于 Seedream、动作生成和自由模式。')}
      ${keyRow('set-gpt-key', 'GPT-Image-2 API Key', settings.gptImageApiKey, '仅在孵化时选择 gpt-image-2 后端才需要。')}
    </section>

    <section class="settings-section"><h3>桌宠</h3>
      <div class="setting-block"><div class="setting-copy"><span class="setting-title">大小</span><p>拖动时实时调整桌宠窗口。</p></div><div class="range-control"><input id="set-scale" type="range" min="0.5" max="2" step="0.1" value="${scale}" /><b id="set-scale-value">${Math.round(scale * 100)}%</b></div></div>
    </section>

    <section class="settings-section"><h3>声音与陪伴</h3>
      ${toggleRow('set-voice-enabled', '开启叽歪语音', '关闭后文字气泡仍然显示。', settings.voiceEnabled ?? true)}
      <div class="setting-block"><div class="setting-copy"><span class="setting-title">音量</span></div><div class="range-control"><input id="set-voice-volume" type="range" min="0" max="100" step="5" value="${volume}" /><b id="set-volume-value">${volume}</b></div></div>
      <div class="setting-block"><div class="setting-copy"><label for="set-talk-frequency">说话频率</label><p>控制角色随机自言自语的间隔。</p></div><select id="set-talk-frequency"><option value="quiet"${settings.talkFrequency === 'quiet' ? ' selected' : ''}>安静</option><option value="normal"${(settings.talkFrequency ?? 'normal') === 'normal' ? ' selected' : ''}>正常</option><option value="chatty"${settings.talkFrequency === 'chatty' ? ' selected' : ''}>话痨</option></select></div>
    </section>

    <section class="settings-section"><h3>行为模式</h3>
      ${toggleRow('set-free-mode', '自由模式', '叠加 LLM 脑自主判断时机、说话和动作；需要方舟 Key。关闭时使用完全本地的陪伴模式。', !!settings.freeMode)}
    </section>

    <section class="settings-section"><h3>隐私与数据</h3>
      ${toggleRow('set-show-pet', '在公共房间展示桌宠形象', '开启后上传动作资产供房友桌面显示；关闭后房友只看到缩略图。', settings.roomsShowMyPet !== false)}
      ${toggleRow('set-foreground-observation', '记录前台应用和窗口标题', '默认关闭；只保存系统公开元数据，本地保留 7 天，不读取窗口正文。', settings.foregroundObservationEnabled === true)}
      <div class="privacy-note">键盘监控只累计次数，不记录具体按键。公共房间可能同步状态、动作和当前牌面，但不会同步未展示的会话正文、项目路径或角色人设。</div>
    </section>

    <section class="settings-section"><h3>高级</h3>
      ${toggleRow('set-developer-mode', '显示开发者工具', '开启后在侧栏显示规则引擎、感知日志和数值注水入口。', !!settings.developerMode)}
    </section>
  </div>`;
}

function toggleRow(id: string, title: string, description: string, checked: boolean): string {
  return `<label class="setting-block toggle-block" for="${id}"><span class="setting-copy"><span class="setting-title">${title}</span><p>${description}</p></span><span class="switch"><input id="${id}" type="checkbox" ${checked ? 'checked' : ''}/><span></span></span></label>`;
}

function attr(value: string | undefined): string {
  return (value ?? '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function syncFrom(host: HTMLElement, settings: Settings): void {
  const setValue = (selector: string, value: string) => {
    const input = host.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
    if (input && document.activeElement !== input) input.value = value;
  };
  const setChecked = (selector: string, value: boolean) => {
    const input = host.querySelector<HTMLInputElement>(selector);
    if (input) input.checked = value;
  };
  setValue('#set-nickname', settings.nickname ?? settings.marketNickname ?? '');
  setValue('#set-scale', String(settings.petScale ?? 1));
  setValue('#set-voice-volume', String(settings.voiceVolume ?? 70));
  setValue('#set-talk-frequency', settings.talkFrequency ?? 'normal');
  const scaleLabel = host.querySelector('#set-scale-value');
  if (scaleLabel) scaleLabel.textContent = `${Math.round((settings.petScale ?? 1) * 100)}%`;
  const volumeLabel = host.querySelector('#set-volume-value');
  if (volumeLabel) volumeLabel.textContent = String(settings.voiceVolume ?? 70);
  setChecked('#set-voice-enabled', settings.voiceEnabled ?? true);
  setChecked('#set-show-pet', settings.roomsShowMyPet !== false);
  setChecked('#set-foreground-observation', settings.foregroundObservationEnabled === true);
  setChecked('#set-free-mode', !!settings.freeMode);
  setChecked('#set-developer-mode', !!settings.developerMode);
}

function bind(host: HTMLElement): void {
  const q = <T extends HTMLElement>(selector: string): T => host.querySelector<T>(selector)!;
  q<HTMLInputElement>('#set-nickname').addEventListener('change', (event) => {
    const nickname = (event.target as HTMLInputElement).value.trim();
    void window.qbot.settings.set({ nickname, marketNickname: nickname });
  });
  const bindKey = (selector: string, key: 'arkApiKey' | 'gptImageApiKey') => {
    q<HTMLInputElement>(selector).addEventListener('change', (event) => {
      void window.qbot.settings.set({ [key]: (event.target as HTMLInputElement).value.trim() });
      const state = (event.target as HTMLElement).closest('.setting-block')?.querySelector('.key-state');
      if (state) {
        const configured = !!(event.target as HTMLInputElement).value.trim();
        state.textContent = configured ? '已配置' : '未配置';
        state.classList.toggle('configured', configured);
      }
    });
  };
  bindKey('#set-ark-key', 'arkApiKey');
  bindKey('#set-gpt-key', 'gptImageApiKey');
  host.querySelectorAll<HTMLButtonElement>('.key-reveal').forEach((button) => {
    button.addEventListener('click', () => {
      const input = q<HTMLInputElement>(`#${button.dataset.target}`);
      input.type = input.type === 'password' ? 'text' : 'password';
      button.textContent = input.type === 'password' ? '显示' : '隐藏';
    });
  });
  host.querySelectorAll<HTMLButtonElement>('.key-clear').forEach((button) => {
    button.addEventListener('click', () => {
      const input = q<HTMLInputElement>(`#${button.dataset.target}`);
      input.value = '';
      input.dispatchEvent(new Event('change'));
    });
  });
  q<HTMLInputElement>('#set-scale').addEventListener('input', (event) => {
    const value = parseFloat((event.target as HTMLInputElement).value);
    q('#set-scale-value').textContent = `${Math.round(value * 100)}%`;
    void window.qbot.settings.set({ petScale: value });
  });
  q<HTMLInputElement>('#set-voice-enabled').addEventListener('change', (event) => void window.qbot.settings.set({ voiceEnabled: (event.target as HTMLInputElement).checked }));
  q<HTMLInputElement>('#set-voice-volume').addEventListener('input', (event) => {
    const value = parseInt((event.target as HTMLInputElement).value, 10);
    q('#set-volume-value').textContent = String(value);
    void window.qbot.settings.set({ voiceVolume: value });
  });
  q<HTMLSelectElement>('#set-talk-frequency').addEventListener('change', (event) => void window.qbot.settings.set({ talkFrequency: (event.target as HTMLSelectElement).value as 'quiet' | 'normal' | 'chatty' }));
  q<HTMLInputElement>('#set-show-pet').addEventListener('change', (event) => void window.qbot.settings.set({ roomsShowMyPet: (event.target as HTMLInputElement).checked }));
  q<HTMLInputElement>('#set-foreground-observation').addEventListener('change', (event) => void window.qbot.settings.set({ foregroundObservationEnabled: (event.target as HTMLInputElement).checked }));
  q<HTMLInputElement>('#set-free-mode').addEventListener('change', (event) => void window.qbot.settings.set({ freeMode: (event.target as HTMLInputElement).checked }));
  q<HTMLInputElement>('#set-developer-mode').addEventListener('change', (event) => void window.qbot.settings.set({ developerMode: (event.target as HTMLInputElement).checked }));
}
