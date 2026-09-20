import '../../nursery/lounge.css';
import { mountView } from '../../lounge/view';
let view: Awaited<ReturnType<typeof mountView>>;
export async function mount(root: HTMLElement) { view = await mountView(root); }
export function onVisible() { return view.onVisible(); }
export function unmount() { view.unmount(); }
