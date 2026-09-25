import type { BrowserWindow } from 'electron';
const logicalSizes=new WeakMap<BrowserWindow,{width:number;height:number}>();
export function fixedWindowSize(win:BrowserWindow):{width:number;height:number}|undefined{return logicalSizes.get(win);}

/** Never read the current size back into a move: fractional Windows DPI rounds it up. */
export function moveFixedSize(
  win: BrowserWindow | null,
  x: number,
  y: number,
  size: {width:number;height:number},
  changesSize = false,
): void {
  if (!win || win.isDestroyed() || !Number.isFinite(x) || !Number.isFinite(y)) return;
  logicalSizes.set(win,{...size});
  const bounds = {x:Math.round(x),y:Math.round(y),width:size.width,height:size.height};
  if (changesSize) {
    const resizable = win.isResizable();
    if (!resizable) win.setResizable(true);
    try { win.setBounds(bounds); }
    finally { if (!resizable) win.setResizable(false); }
  } else if (process.platform === 'win32') {
    // setPosition internally reuses rounded getBounds dimensions on Windows.
    // Explicit logical dimensions prevent growth without toggling resizability per frame.
    win.setBounds(bounds);
  } else {
    // Preserve macOS transparent-window rendering: move without resizing.
    win.setPosition(bounds.x,bounds.y);
  }
}
