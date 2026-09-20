export {};
const sign = document.querySelector<HTMLElement>('#sign')!;
const textEl = document.querySelector<HTMLElement>('#text')!;
const board = document.querySelector<HTMLElement>('#board')!;
const dismiss = document.querySelector<HTMLButtonElement>('#dismiss')!;
function reportBounds() {
  const b = board.getBoundingClientRect(), c = dismiss.getBoundingClientRect();
  window.qbot.sign.reportBounds({ left: Math.min(b.left, c.left), top: Math.min(b.top, c.top), right: Math.max(b.right, c.right), bottom: Math.max(b.bottom, c.bottom) });
}
/** 短句优先在中文标点后换行；密集标点不撑出过多行，交给浏览器限宽排版。 */
function wrapText(text: string): string {
  const clauses = text.split(/(?<=[，。！？；])/u).filter(Boolean);
  const lines: string[] = [];
  for (const clause of clauses) {
    const last = lines.at(-1);
    if (last !== undefined && [...last, ...clause].length <= 9) lines[lines.length - 1] += clause;
    else lines.push(clause);
  }
  return lines.reduce((n, line) => n + Math.ceil([...line].length / 9), 0) <= 7 ? lines.join('\n') : text;
}
window.qbot.sign.onDisplay(text => {
  textEl.textContent = wrapText(text ?? '');
  sign.classList.toggle('show', Boolean(text));
  requestAnimationFrame(reportBounds);
});
sign.addEventListener('transitionend', reportBounds);
window.addEventListener('resize', reportBounds);
window.qbot.sign.onHover(hovered => board.classList.toggle('hovered', hovered));
dismiss.addEventListener('click', () => window.qbot.sign.dismiss());
