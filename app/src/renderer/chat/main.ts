export {};
const form = document.querySelector<HTMLFormElement>('#chat-form')!;
const input = document.querySelector<HTMLTextAreaElement>('#message')!;
const send = document.querySelector<HTMLButtonElement>('#send')!;
const status = document.querySelector<HTMLElement>('#status')!;
let busy = false;
form.addEventListener('submit', async e => {
  e.preventDefault();
  if (busy || !input.value.trim()) return;
  const text = input.value;
  busy = true; send.disabled = true; input.readOnly = true;
  status.className = ''; status.textContent = '正在想怎么回复你…';
  try {
    const result = await window.qbot.bubble.sendChat(text);
    if (!result.ok) throw new Error(result.error || '发送失败，请重试');
    input.value = ''; status.textContent = '回复在头顶啦 · 可以继续聊';
  } catch (error) { status.className = 'error'; status.textContent = String(error instanceof Error ? error.message : error); status.title = status.textContent; }
  finally { busy = false; send.disabled = false; input.readOnly = false; input.focus(); }
});
input.addEventListener('keydown', e => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && e.keyCode !== 229) { e.preventDefault(); form.requestSubmit(); }
});
document.querySelector('#close')!.addEventListener('click', () => window.qbot.bubble.closeChat());
window.addEventListener('keydown', e => { if (e.key === 'Escape') window.qbot.bubble.closeChat(); });
window.addEventListener('focus', () => input.focus());
