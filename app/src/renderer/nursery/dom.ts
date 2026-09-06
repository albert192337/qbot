/** Text is always assigned as text, including names and server errors. */
export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  text?: string,
  className?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (text !== undefined) node.textContent = text;
  if (className) node.className = className;
  return node;
}
export function button(
  text: string,
  action: () => void,
  className = 'secondary',
): HTMLButtonElement {
  const node = el('button', text, className);
  node.type = 'button';
  node.addEventListener('click', action);
  return node;
}
export function image(
  url: string,
  alt: string,
  className: string = '',
): HTMLImageElement {
  const node = el('img', undefined, className);
  node.src = url;
  node.alt = alt;
  return node;
}
