import '../../nursery/lounge.css';
import { mountView } from '../../lounge/view';
let view: Awaited<ReturnType<typeof mountView>>;
export async function mount(root: HTMLElement) { view = await mountView(root); const open=document.createElement('button'); open.className='btn primary'; open.textContent='打开一起玩 · 世界与本地试演 ↗'; open.onclick=()=>window.qbot.rooms.open(); root.prepend(open); }
export function onVisible() { return view.onVisible(); }
export function unmount() { view.unmount(); }
