/** 装扮市场窗：货架网格 + 上传/下载/下架（所有网络请求经主进程，见 main/market.ts） */
import type { MarketSkin } from '../../shared/ipc-types';

const grid = document.getElementById('grid')!;
const statusEl = document.getElementById('status')!;
const nickInput = document.getElementById('nickname') as HTMLInputElement;
const uploadSelect = document.getElementById('upload-select') as HTMLSelectElement;
const uploadBtn = document.getElementById('upload-btn') as HTMLButtonElement;
const refreshBtn = document.getElementById('refresh-btn') as HTMLButtonElement;

let busy = false;

function setStatus(text: string, isError = false): void {
  statusEl.textContent = text;
  statusEl.classList.toggle('error', isError);
}

function errText(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  // ipcRenderer.invoke 的报错带 "Error invoking remote method ..." 前缀，剥掉留人话
  return msg.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
}

function fmtSize(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

// ── 昵称（本地设置） ────────────────────────────────────────
void window.qbot.settings.get().then((s) => {
  nickInput.value = s.marketNickname ?? '';
});
nickInput.addEventListener('change', () => {
  void window.qbot.settings.set({ marketNickname: nickInput.value.trim() });
});

// ── 上传角色下拉（默认当前激活） ────────────────────────────
async function refreshUploadOptions(): Promise<void> {
  const [all, active] = await Promise.all([
    window.qbot.characters.list(),
    window.qbot.characters.getActive(),
  ]);
  uploadSelect.replaceChildren();
  for (const c of all.filter((c) => c.manifest)) {
    const opt = document.createElement('option');
    opt.value = c.dirId;
    opt.textContent = c.manifest.name || c.dirId.slice(0, 8);
    if (c.dirId === active?.dirId) opt.selected = true;
    uploadSelect.appendChild(opt);
  }
  uploadBtn.disabled = uploadSelect.options.length === 0;
}

// ── 货架渲染 ────────────────────────────────────────────────
function renderCard(skin: MarketSkin): HTMLElement {
  const card = document.createElement('div');
  card.className = 'card';

  if (skin.previewUrl) {
    const img = document.createElement('img');
    img.className = 'cover';
    img.src = skin.previewUrl;
    img.loading = 'lazy';
    card.appendChild(img);
  } else {
    const ph = document.createElement('div');
    ph.className = 'cover';
    ph.textContent = '🐾';
    card.appendChild(ph);
  }

  const body = document.createElement('div');
  body.className = 'body';
  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = skin.name;
  name.title = skin.name;
  const meta = document.createElement('div');
  meta.className = 'meta';
  meta.textContent = `by ${skin.uploader} · ${skin.actions} 动作 · ${fmtSize(skin.size)}`;
  const btns = document.createElement('div');
  btns.className = 'btns';

  const dlBtn = document.createElement('button');
  dlBtn.textContent = skin.installed ? '使用' : '下载·使用';
  dlBtn.addEventListener('click', () => void run(async () => {
    setStatus(skin.installed ? `切换到「${skin.name}」…` : `下载「${skin.name}」…`);
    await window.qbot.market.download(skin.hash);
    setStatus(`已换上「${skin.name}」🎉`);
    await refreshShelf();
  }));
  btns.appendChild(dlBtn);

  if (skin.mine) {
    const rmBtn = document.createElement('button');
    rmBtn.className = 'danger';
    rmBtn.textContent = '下架';
    rmBtn.addEventListener('click', () => void run(async () => {
      if (!confirm(`把「${skin.name}」从市场下架？`)) return;
      await window.qbot.market.remove(skin.hash);
      setStatus(`已下架「${skin.name}」`);
      await refreshShelf();
    }));
    btns.appendChild(rmBtn);
  }

  body.append(name, meta, btns);
  card.appendChild(body);
  return card;
}

async function refreshShelf(): Promise<void> {
  const skins = await window.qbot.market.list();
  grid.replaceChildren();
  if (skins.length === 0) {
    const empty = document.createElement('div');
    empty.id = 'empty';
    empty.textContent = '货架空空的——上传第一只角色吧';
    grid.appendChild(empty);
    return;
  }
  for (const s of skins) grid.appendChild(renderCard(s));
}

/** 串行化操作：网络中不重入，报错进状态条 */
async function run(fn: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  uploadBtn.disabled = true;
  try {
    await fn();
  } catch (err) {
    setStatus(errText(err), true);
  } finally {
    busy = false;
    uploadBtn.disabled = uploadSelect.options.length === 0;
  }
}

uploadBtn.addEventListener('click', () => void run(async () => {
  const dirId = uploadSelect.value;
  if (!dirId) return;
  const label = uploadSelect.selectedOptions[0]?.textContent ?? dirId;
  setStatus(`打包上传「${label}」…（约 10MB，稍等）`);
  await window.qbot.market.upload(dirId);
  setStatus(`「${label}」已上架 ✓`);
  await refreshShelf();
}));

refreshBtn.addEventListener('click', () => void run(refreshShelf));

// ── 启动 ────────────────────────────────────────────────────
void run(async () => {
  setStatus('加载货架…');
  await refreshUploadOptions();
  await refreshShelf();
  setStatus('');
});
