import type {
  CharacterForm,
  CharacterStyle,
  ImageProvider,
} from '@qbot/pipeline';
import type { QBotApi } from '../../shared/ipc-types';
import { button, el } from './dom';
import { errorMessage } from './model';
export interface CreationDraft {
  path: string;
  name: string;
  provider: ImageProvider;
  form: CharacterForm;
  style: CharacterStyle;
  mode: 'cloud' | 'local';
}
/** The form element stays mounted between visits so Chinese input and drafts survive navigation. */
export class CreationForm {
  readonly root = el('div');
  private file: File | null = null;
  private sourceUrl: string | null = null;
  private mode: 'cloud' | 'local' = 'cloud';
  private provider = el('select');
  private name = el('input');
  private style = el('select');
  private upload = button(
    '把角色图片放上来',
    () => this.picker.click(),
    'upload',
  );
  private picker = el('input');
  private error = el('p', '', 'error-text');
  private accountLabel = el('p', '正在查看孵化资格…', 'status-line');
  private accountPanel = el('div', undefined, 'account');
  private note = el('p', '', 'cost-note');
  private submit = button('开始孵化', () => void this.start(), 'primary wide');
  private locked = false;
  private submitting = false;
  private externalBusy = false;
  constructor(
    private api: QBotApi,
    private preview: (url: string | null) => void,
    private create: (draft: CreationDraft) => Promise<boolean>,
  ) {
    this.root.append(button('🐾 从一整套表情包创建', () => this.api.ui.openConsole('sticker-create'), 'quiet'));
    this.name.placeholder = '你想怎么称呼它？';
    this.name.maxLength = 24;
    this.name.autocomplete = 'off';
    this.picker.type = 'file';
    this.picker.accept = 'image/png,image/jpeg,image/webp';
    this.picker.hidden = true;
    this.picker.addEventListener('change', () => {
      if (this.picker.files?.[0]) this.select(this.picker.files[0]);
      this.picker.value = '';
    });
    this.upload.append(
      el('small', '选择 PNG / JPG / WebP，也可以直接拖进小屋。'),
    );
    for (const [value, label] of [
      ['chibi', '小小的 Q 版朋友'],
      ['faithful', '保留原来的比例'],
      ['abstract', '动物 / 小物件 / 非人形'],
    ]) {
      const option = el('option', label);
      option.value = value;
      this.style.append(option);
    }
    const nameField = el('label', '它的名字', 'form-field');
    nameField.append(this.name);
    const styleField = el('label', '希望它是什么模样', 'form-field');
    styleField.append(this.style);
    this.error.hidden = true;
    const more = el('details');
    more.append(el('summary', '生成方式'));
    const providerField = el('label', '形象模型', 'form-field');
    providerField.append(this.provider);
    more.append(
      providerField,
      button(
        '配置本地模型与 API',
        () => this.api.ui.openConsole('settings'),
        'quiet',
      ),
    );
    const inviteLabel = el('label', '内测邀请码');
    const invite = el('input');
    invite.type = 'password';
    invite.autocomplete = 'off';
    invite.placeholder = '输入邀请码';
    inviteLabel.append(invite);
    const connect = button('连接', () => void this.connect(invite, connect));
    const connectRow = el('div', undefined, 'row');
    connectRow.append(inviteLabel, connect);
    this.accountPanel.append(this.accountLabel, connectRow);
    this.root.append(
      el('p', '先给它一个名字，再让这张图片慢慢变成会动的朋友。'),
      this.upload,
      this.picker,
      nameField,
      styleField,
      more,
      this.accountPanel,
      this.note,
      this.error,
      this.submit,
    );
    void this.refreshAccount();
  }
  showError(message: string): void {
    this.error.textContent = message;
    this.error.hidden = !message;
  }
  get url(): string | null {
    return this.sourceUrl;
  }
  select(file: File): void {
    if (this.locked) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      this.showError('请选择 PNG、JPG 或 WebP 图片。');
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      this.showError('图片需要小于 20 MB。');
      return;
    }
    if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
    this.file = file;
    this.sourceUrl = URL.createObjectURL(file);
    this.preview(this.sourceUrl);
    this.upload.replaceChildren(
      el('span', '图片已放好 · 换一张'),
      el('small', file.name),
    );
    this.showError('');
  }
  private async connect(
    invite: HTMLInputElement,
    control: HTMLButtonElement,
  ): Promise<void> {
    if (!invite.value.trim()) {
      this.showError('先填写邀请码。');
      return;
    }
    control.disabled = true;
    try {
      await this.api.hatch.cloudAccount(invite.value.trim());
      invite.value = '';
      await this.refreshAccount();
      this.showError('');
    } catch (e) {
      this.showError(errorMessage(e));
    } finally {
      control.disabled = false;
    }
  }
  async refreshAccount(): Promise<void> {
    try {
      const settings = await this.api.settings.get();
      this.mode = settings.generationMode ?? 'cloud';
      this.accountPanel.hidden = this.mode === 'local';
      let providers: ImageProvider[] = ['seedream', 'gpt-image-2'];
      if (this.mode === 'cloud') {
        const account = await this.api.hatch.cloudAccount();
        this.accountLabel.textContent = account.connected
          ? '孵化资格已连接 · 不限次数迎接新朋友'
          : '连接邀请码，就可以开始孵化。';
        providers = account.providers.length ? account.providers : ['seedream'];
      }
      const previous = this.provider.value;
      this.provider.replaceChildren();
      for (const id of providers) {
        const option = el(
          'option',
          id === 'seedream' ? 'Seedream' : 'GPT-Image-2',
        );
        option.value = id;
        this.provider.append(option);
      }
      if (providers.includes(previous as ImageProvider))
        this.provider.value = previous;
      this.note.textContent =
        this.mode === 'cloud'
          ? '有效邀请码可不限次数孵化、换方案和失败重试。所选图片、名字和形象选项会上传至 QBot 及模型服务。确认形象后生成一套基础动作；关闭小屋或客户端仍会继续。'
          : '当前使用自己的模型 Key。先生成 1 个形象，确认后生成 10 个动作；提交的模型请求会产生费用。可以离开小屋，退出客户端会暂停本地任务。';
      this.submit.textContent =
        this.mode === 'cloud'
          ? '开始孵化 · 不限次数'
          : '开始孵化 · 使用模型 API';
    } catch (e) {
      this.showError(errorMessage(e));
    }
  }
  setBusy(busy: boolean): void {
    this.externalBusy = busy;
    this.locked = busy || this.submitting;
    this.root
      .querySelectorAll<
        HTMLInputElement | HTMLButtonElement | HTMLSelectElement
      >('input,button,select')
      .forEach((node) => {
        node.disabled = this.locked;
      });
  }
  private async start(): Promise<void> {
    if (this.locked) return;
    if (!this.file) {
      this.showError('先把一张角色图片放上孵化台。');
      return;
    }
    if (!this.name.value.trim()) {
      this.showError('先给新朋友起一个名字。');
      this.name.focus();
      return;
    }
    this.submitting = true;
    this.setBusy(this.externalBusy);
    this.showError('');
    try {
      const settings = await this.api.settings.get();
      if ((settings.generationMode ?? 'cloud') !== this.mode) {
        await this.refreshAccount();
        throw new Error('生成方式已更新，请看一下新的说明后再开始。');
      }
      if (this.mode === 'cloud') {
        const account = await this.api.hatch.cloudAccount();
        if (!account.connected) throw new Error('请先连接邀请码。');
      } else if (
        !settings.arkApiKey ||
        (this.provider.value === 'gpt-image-2' && !settings.gptImageApiKey)
      )
        throw new Error('请先在设置中配置所选模型的 API Key。');
      const path = this.api.hatch.getPathForFile(this.file);
      if (!path) throw new Error('无法读取图片路径，请重新选择本机图片。');
      await this.create({
        path,
        name: this.name.value.trim(),
        provider: this.provider.value as ImageProvider,
        form: this.style.value === 'abstract' ? 'abstract' : 'humanoid',
        style: this.style.value === 'faithful' ? 'faithful' : 'chibi',
        mode: this.mode,
      });
    } catch (e) {
      this.showError(errorMessage(e));
    } finally {
      this.submitting = false;
      this.setBusy(this.externalBusy);
    }
  }
  dispose(): void {
    if (this.sourceUrl) URL.revokeObjectURL(this.sourceUrl);
  }
}
