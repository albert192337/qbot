import { mountMemoryPanel } from './memory-panel';
let panel: ReturnType<typeof mountMemoryPanel> | undefined;
export function mount(root: HTMLElement): void { panel = mountMemoryPanel(root, false); }
export function onVisible(): Promise<void> | undefined { return panel?.refresh(); }
export function unmount(): void { panel?.dispose(); panel = undefined; }
