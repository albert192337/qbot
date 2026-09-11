import './memory.css';
import type { UserMemory, MemoryEdit, MemorySnapshot } from '../../../shared/memory';
const kindNames = { fact: '关于你', preference: '相处偏好', topic: '最近惦记的事', episode: '我们的回忆', observation: '待确认的观察' };
function element<K extends keyof HTMLElementTagNameMap>(tag: K, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag); if (text !== undefined) node.textContent = text; return node;
}
export function mountMemoryPanel(host: HTMLElement, debug: boolean) {
  const root = element('section'); root.className = 'memory-panel';
  const title = element('h3', debug ? '记忆与用户画像' : '我记得的你');
  const intro = element('p', debug ? '查看全部角色的记录、依据和调用过程。事实与待确认观察分别标记。' : '慢慢相处，把值得记住的小事留在这里。你可以随时帮我改正。');
  const toolbar = element('div'); toolbar.className = 'memory-toolbar';
  const picker = element('select'); picker.setAttribute('aria-label', '查看哪位朋友的记忆');
  const refreshButton = element('button', '刷新'); refreshButton.type = 'button';
  toolbar.append(picker, refreshButton);
  if (debug) {
    const retry = element('button', '重试未完成的整理');
    retry.onclick = async () => {
      retry.disabled = true;
      try { await window.qbot.memory.retry(); await refresh(); }
      catch (e) { status.textContent = String(e); }
      finally { retry.disabled = false; }
    };
    toolbar.append(retry);
  }
  const status = element('p'); status.setAttribute('role', 'status');
  const cards = element('div'); cards.className = 'memory-cards';
  const detail = element('div');
  root.append(title, intro, toolbar, status, cards, detail); host.append(root);
  let disposed = false, busy = false, editing = false, generation = 0, signature = '';
  const names = new Map<string, string>();
  const name = (id: string) => names.get(id) ?? (id === 'default' ? '桌面朋友' : id);
  const time = (at: number) => new Date(at).toLocaleString();
  async function act(command: MemoryEdit) {
    if (busy) return;
    busy = true; picker.disabled = true;
    root.querySelectorAll('button').forEach(b => b.disabled = true);
    try { await window.qbot.memory.edit(command, picker.value); editing = false; signature = ''; await refresh(true); }
    catch (e) { status.textContent = `没有保存成功：${e instanceof Error ? e.message : String(e)}`; }
    finally { busy = false; picker.disabled = editing; root.querySelectorAll('button').forEach(b => b.disabled = false); }
  }
  function card(m: UserMemory) {
    const article = element('article'); article.dataset.memoryId = m.id;
    const expired = !!m.expiresAt && m.expiresAt <= Date.now();
    article.append(element('small', `${kindNames[m.kind]} · ${m.scope === 'shared' ? '朋友们共享' : `与${name(m.characterId)}之间`} · ${m.status === 'resolved' ? '已结束' : expired ? '已过期' : m.certainty === 'tentative' ? '待确认' : '已记下'}${!m.proactive ? ' · 不主动提' : ''}`));
    article.append(element('p', m.text));
    if (debug) {
      const evidence = element('details'); evidence.append(element('summary', '依据与完整记录'));
      const pre = element('pre', JSON.stringify({ ...m, 来源角色名: name(m.evidence.characterId) }, null, 2));
      evidence.append(pre); article.append(evidence);
    } else article.append(element('small', `${m.kind === 'episode' ? '那一天' : '最近记下'}：${time(m.updatedAt)}`));
    // Debug shows all records, but mutation always targets the selected relationship.
    if (m.scope === 'character' && m.characterId !== picker.value) return article;
    const actions = element('div'); actions.className = 'memory-actions';
    function action(label: string, run: () => void) { const b = element('button', label); b.type = 'button'; b.onclick = run; actions.append(b); }
    action('改一下', () => {
      if (editing) return; editing = true; picker.disabled = true;
      const form = element('form'); const input = element('textarea'); input.value = m.text; input.maxLength = 500; input.required = true; input.setAttribute('aria-label', '纠正这条记忆');
      const save = element('button', '保存'); save.type = 'submit';
      const cancel = element('button', '取消'); cancel.type = 'button'; cancel.onclick = () => { editing = false; picker.disabled = false; form.remove(); };
      form.append(input, element('p', '纠正会清理相关来源记录、近期对话和旧调用日志，避免继续使用旧内容。'), save, cancel);
      form.onsubmit = e => { e.preventDefault(); void act({ id: m.id, action: 'edit', text: input.value }); };
      article.append(form); input.focus();
    });
    if (m.status === 'active' && m.kind === 'topic') action('这件事结束了', () => void act({ id: m.id, action: 'resolve' }));
    action(m.proactive ? '记着，别主动提' : '可以主动提', () => void act({ id: m.id, action: m.proactive ? 'quiet' : 'resume' }));
    action('忘掉', () => {
      if (editing) return; editing = true; picker.disabled = true;
      const confirm = element('div'); confirm.setAttribute('role', 'group');
      const yes = element('button', '确认忘掉'); const no = element('button', '取消');
      yes.onclick = () => void act({ id: m.id, action: 'forget' }); no.onclick = () => { editing = false; picker.disabled = false; confirm.remove(); };
      confirm.append(element('p', '会同时清理同一来源的记忆、近期对话和旧调用日志。'), yes, no); article.append(confirm);
    });
    article.append(actions); return article;
  }
  function render(s: MemorySnapshot) {
    status.textContent = s.storageError ? `保存异常：${s.storageError}` : debug
      ? `${s.processing.status} · 待处理 ${s.processing.pending}${s.processing.error ? ` · ${s.processing.error}` : ''}`
      : '这里展示已明确记下的内容；只属于其他朋友的回忆会留在它们自己的手记里。';
    cards.replaceChildren(...s.memories.sort((a, b) => b.updatedAt - a.updatedAt).map(card));
    if (!s.memories.length) cards.append(element('p', '还没有记下的事情。聊聊你的喜好，或一起收获一株特别的植物吧。'));
    detail.replaceChildren();
    if (debug) for (const [label, value] of [ ['整理任务', s.jobs], ['最近更新记录', s.history], ['最近调用：选中与排除原因', s.selections] ] as const) {
      const block = element('details'); block.append(element('summary', label), element('pre', JSON.stringify(value, null, 2))); detail.append(block);
    }
  }
  async function refresh(force = false) {
    if (disposed || (editing && !force)) return;
    const request = ++generation;
    try {
      if (!picker.options.length) {
        const [characters, active] = await Promise.all([window.qbot.characters.list(), window.qbot.characters.getActive()]);
        if (disposed || request !== generation) return;
        for (const c of characters.filter(c => c.manifest)) { names.set(c.dirId, c.manifest.name); const option = element('option', c.manifest.name); option.value = c.dirId; picker.append(option); }
        if (!picker.options.length) { const option = element('option', '桌面朋友'); option.value = 'default'; picker.append(option); }
        if (active && names.has(active.dirId)) picker.value = active.dirId;
      }
      const s = await window.qbot.memory.get(picker.value, debug);
      if (disposed || request !== generation) return;
      const next = JSON.stringify(s);
      if (signature !== next || force) { signature = next; render(s); }
    } catch (e) { if (!disposed && request === generation) status.textContent = `读取失败：${e instanceof Error ? e.message : String(e)}`; }
  }
  picker.onchange = () => { editing = false; signature = ''; void refresh(); };
  refreshButton.onclick = () => void refresh();
  const timer = setInterval(() => { if (root.getClientRects().length && !busy) void refresh(); }, 3000);
  void refresh();
  return { refresh, dispose: () => { disposed = true; ++generation; clearInterval(timer); root.remove(); } };
}
