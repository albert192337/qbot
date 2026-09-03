/**
 * 表情包导入 pane：GIF 贴纸 → 模型语义打标 → 动作槽位映射 → 转码落盘。
 * 自 main 分支的 studio「表情包导入」tab 迁入（spec 2026-08-21-sticker-pack-import-design §2）。
 *
 * 改造点同其余 pane：DOM 查询 root 作用域、alert/confirm 换非阻塞 UI、
 * 局部重渲染代替整页刷新。
 */
import type { AnalyzedSticker } from '../../../shared/ipc-types';
import { confirmBox, esc, getAssetNonce, loadStudioContext, toast } from './_studio-shared';

/**
 * 可落槽的动作槽位。坑 12：renderer 不能 value import pipeline
 * （会把整个 index 拖进浏览器包），所以本地重声明。
 * 与 pipeline/src/sticker-import.ts 的 CATEGORY_TO_SLOT 值域保持一致。
 */
const STICKER_SLOTS: Array<{ id: string; label: string }> = [
  { id: 'idle', label: '待机' },
  { id: 'sleep', label: '睡觉' },
  { id: 'tea', label: '喝茶' },
  { id: 'talk_happy', label: '聊天·开心' },
  { id: 'talk_annoyed', label: '聊天·嫌弃' },
];

/** 与 pipeline 的 CONFIDENCE_HIGH / CONFIDENCE_LOW 保持一致 */
const CONF_HIGH = 0.6;
const CONF_LOW = 0.35;

function confTier(c: number): 'high' | 'medium' | 'low' {
  return c >= CONF_HIGH ? 'high' : c >= CONF_LOW ? 'medium' : 'low';
}

/** 复核中的贴纸（analyze 结果 + 用户改过的槽位） */
interface ReviewItem extends AnalyzedSticker {
  /** 用户当前选择的槽位（'' = 进备选库） */
  chosenSlot: string;
}

let root: HTMLElement | null = null;
let boundDirId: string | null = null;
let reviewItems: ReviewItem[] = [];

export async function mount(host: HTMLElement): Promise<void> {
  root = host;
  await refresh();
}

export function unmount(): void {
  root = null;
  boundDirId = null;
  reviewItems = [];
}

export async function onVisible(): Promise<void> {
  // 复核进行中就别重渲染，否则用户选好的槽位会被冲掉
  if (reviewItems.length === 0) await refresh();
}

async function refresh(): Promise<void> {
  const host = root;
  if (!host) return;
  const ctx = await loadStudioContext(host);
  if (!ctx) {
    boundDirId = null;
    return;
  }
  boundDirId = ctx.dirId;
  const imported = Object.entries(ctx.m.importedActions ?? {});
  const spares = ctx.m.spareStickers ?? [];

  let html = '<div class="studio-body">';
  html += `<div class="page-heading"><div><p class="eyebrow">角色工作台 · 添加动作</p><h2>GIF 动作导入</h2><p class="page-summary">先分析、再复核；确认之前不会修改现有角色资产。</p></div></div>`;
  html += `<p class="studio-hint">导入一套 GIF 表情包，模型会自动分析每张贴纸的语义并映射到桌宠动作。
    一次最多 50 张，v1 只支持 .gif。</p>`;

  if (imported.length > 0) {
    html += `<div class="warn-box" style="background:#e8f5e9;border-color:#a5d6a7;color:#2e7d32">`;
    html += `当前有 <b>${imported.length}</b> 个动作来自导入的表情包`;
    if (spares.length > 0) html += `，备选库 <b>${spares.length}</b> 张`;
    html += `。这些贴纸<b>覆盖</b>了同名的生成动作，清空后自动恢复。`;
    html += `</div>`;
    html += `<div class="sticker-grid">`;
    for (const [slot, a] of imported) {
      const label = STICKER_SLOTS.find((s) => s.id === slot)?.label ?? slot;
      html += `<div class="sticker-card">`;
      html += `<video src="qbot-asset://${ctx.dirId}/${a.webm}?v=${getAssetNonce()}" muted autoplay loop playsinline></video>`;
      html += `<div class="name">${esc(label)} (${esc(slot)})</div>`;
      html += `<div class="reason">来源：${esc(a.sourceName)}`;
      if (a.manualOverride) html += ` <span class="badge-custom">人工指定</span>`;
      html += `</div></div>`;
    }
    html += `</div>`;
    html += `<div class="btn-row"><button id="clear-stickers" class="btn danger">清空导入，恢复生成动作</button></div>`;
  }

  html += `<div class="sticker-bar">`;
  html += `<button id="pick-sticker-dir" class="btn">选择表情包文件夹…</button>`;
  html += `<span id="sticker-status" class="studio-hint" style="margin:0">或把 GIF 文件拖到这个页面</span>`;
  html += `</div>`;
  html += `<div id="sticker-review"></div>`;
  html += '</div>';

  host.innerHTML = html;
  bind(host, ctx.dirId);
  renderReview();
}

function setStatus(text: string): void {
  const el = root?.querySelector<HTMLElement>('#sticker-status');
  if (el) el.textContent = text;
}

/** 渲染复核网格（analyze 返回后调用） */
function renderReview(): void {
  const box = root?.querySelector<HTMLElement>('#sticker-review');
  if (!box) return;
  if (reviewItems.length === 0) {
    box.innerHTML = '';
    return;
  }

  const lowCount = reviewItems.filter((i) => confTier(i.confidence) === 'low').length;
  let html = `<h3>复核映射（${reviewItems.length} 张）</h3>`;
  html += `<p class="studio-hint">`
    + `<span class="conf-badge conf-high">绿</span> 高置信可直接采纳　`
    + `<span class="conf-badge conf-medium">黄</span> 建议确认　`
    + `<span class="conf-badge conf-low">红</span> 请人工指定。`
    + `同一槽位只能有一张贴纸，多选会互相顶掉；选「不使用」则进备选库。</p>`;
  if (lowCount > 0) {
    html += `<div class="warn-box">有 <b>${lowCount}</b> 张贴纸模型判断不准，已默认「不使用」，请手动指定槽位。</div>`;
  }

  html += `<div class="sticker-grid">`;
  reviewItems.forEach((it, i) => {
    const tier = confTier(it.confidence);
    html += `<div class="sticker-card tier-${tier}" data-idx="${i}">`;
    if (it.previewDataUrl) {
      html += `<img src="${it.previewDataUrl}" alt="${esc(it.sourceName)}" />`;
    }
    html += `<div class="name" title="${esc(it.sourceName)}">${esc(it.sourceName)}</div>`;
    html += `<div><span class="conf-badge conf-${tier}">${Math.round(it.confidence * 100)}%</span> `;
    html += `<span style="color:#888">${esc(it.category)}</span></div>`;
    html += `<div class="reason">${esc(it.reason)}</div>`;
    html += `<select class="slot-select" data-idx="${i}">`;
    html += `<option value=""${it.chosenSlot === '' ? ' selected' : ''}>— 不使用（备选库）—</option>`;
    for (const s of STICKER_SLOTS) {
      const sel = it.chosenSlot === s.id ? ' selected' : '';
      html += `<option value="${esc(s.id)}"${sel}>${esc(s.label)}</option>`;
    }
    html += `</select></div>`;
  });
  html += `</div>`;

  const used = reviewItems.filter((i) => i.chosenSlot !== '').length;
  html += `<div class="sticker-bar">`;
  html += `<span>将替换 <b>${used}</b> 个动作，<b>${reviewItems.length - used}</b> 张进备选库</span>`;
  html += `<span style="flex:1"></span>`;
  html += `<button id="cancel-review" class="btn ghost">取消</button>`;
  html += `<button id="apply-stickers" class="btn"${used === 0 ? ' disabled' : ''}>确认导入</button>`;
  html += `</div>`;

  box.innerHTML = html;
  bindReview(box);
}

function bindReview(box: HTMLElement): void {
  // 槽位下拉：同槽位互斥（选了别人已占的槽，把对方顶成备选库）
  box.querySelectorAll<HTMLSelectElement>('.slot-select').forEach((sel) => {
    sel.addEventListener('change', () => {
      const idx = Number(sel.dataset.idx);
      const val = sel.value;
      if (val !== '') {
        reviewItems.forEach((other, i) => {
          if (i !== idx && other.chosenSlot === val) other.chosenSlot = '';
        });
      }
      reviewItems[idx].chosenSlot = val;
      renderReview(); // 整体重渲染：被顶掉的那张下拉也要跟着变
    });
  });

  box.querySelector<HTMLButtonElement>('#cancel-review')?.addEventListener('click', () => {
    // 复核阶段没落任何盘，取消 = 直接丢弃（spec §2.2）
    reviewItems = [];
    renderReview();
    setStatus('已取消，未做任何改动');
  });

  box.querySelector<HTMLButtonElement>('#apply-stickers')?.addEventListener('click', (e) => {
    const btn = e.currentTarget as HTMLButtonElement;
    void apply(btn);
  });
}

async function apply(btn: HTMLButtonElement): Promise<void> {
  const host = root;
  const dirId = boundDirId;
  if (!host || !dirId) return;
  btn.disabled = true;
  setStatus('正在转码落盘…');
  try {
    const result = await window.qbot.studio.applyStickers(
      dirId,
      reviewItems.map((it) => ({
        absPath: it.absPath,
        sourceName: it.sourceName,
        slot: it.chosenSlot === '' ? null : it.chosenSlot,
        category: it.category,
        suggestedSlot: it.slot,
        confidence: it.confidence,
      })),
    );
    reviewItems = [];
    let msg = `已导入 ${result.slots.length} 个动作`;
    if (result.spareCount > 0) msg += `，${result.spareCount} 张进备选库`;
    toast(host, msg);
    if (result.failed.length > 0) {
      toast(
        host,
        `${result.failed.length} 张失败：` +
          result.failed.map((f) => `${f.sourceName}（${f.error}）`).join('、'),
        'warn',
      );
    }
    await refresh(); // manifest 变了（桌宠侧已由主进程热重载）
  } catch (err) {
    toast(host, `导入失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
    btn.disabled = false;
  }
}

function bind(host: HTMLElement, dirId: string): void {
  const pickBtn = host.querySelector<HTMLButtonElement>('#pick-sticker-dir');

  /** analyze → 填复核区。打标要调 API（很便宜），期间禁用按钮防重入 */
  async function analyze(input: { dir?: string; files?: string[] }): Promise<void> {
    if (pickBtn) pickBtn.disabled = true;
    setStatus('正在分析贴纸…（模型打标，通常几秒）');
    try {
      const analyzed = await window.qbot.studio.analyzeStickers(input);
      // 低置信度默认不落槽：强制用户看一眼再决定（spec §2.2）
      reviewItems = analyzed.map((a) => ({
        ...a,
        chosenSlot: confTier(a.confidence) === 'low' ? '' : (a.slot ?? ''),
      }));
      // 同槽位竞争：主进程已按置信度排好序，这里只需保证界面上不重复占位
      const taken = new Set<string>();
      for (const it of reviewItems) {
        if (it.chosenSlot === '') continue;
        if (taken.has(it.chosenSlot)) it.chosenSlot = '';
        else taken.add(it.chosenSlot);
      }
      renderReview();
      setStatus(`分析完成，共 ${analyzed.length} 张`);
    } catch (err) {
      setStatus('');
      toast(host, `分析失败：${err instanceof Error ? err.message : String(err)}`, 'warn');
    } finally {
      if (pickBtn) pickBtn.disabled = false;
    }
  }

  pickBtn?.addEventListener('click', () => {
    void (async () => {
      const dir = await window.qbot.studio.pickStickerDir();
      if (dir) await analyze({ dir });
    })();
  });

  // 拖入 GIF：Electron ≥32 没有 File.path，必须走 preload 的 webUtils（坑 6）
  host.addEventListener('dragover', (ev) => ev.preventDefault());
  host.addEventListener('drop', (ev) => {
    ev.preventDefault();
    const files = Array.from((ev as DragEvent).dataTransfer?.files ?? [])
      .map((f) => window.qbot.hatch.getPathForFile(f))
      .filter((p) => p.toLowerCase().endsWith('.gif'));
    if (files.length === 0) {
      setStatus('没有识别到 GIF 文件');
      return;
    }
    void analyze({ files });
  });

  host.querySelector<HTMLButtonElement>('#clear-stickers')?.addEventListener('click', () => {
    void (async () => {
      const ok = await confirmBox(
        host,
        '清空所有导入的表情包动作，恢复原本生成的动作？\n（贴纸文件保留，可以再导一次）',
      );
      if (!ok) return;
      await window.qbot.studio.clearImportedStickers(dirId);
      await refresh();
    })();
  });
}
