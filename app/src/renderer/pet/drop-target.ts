/** A real window takes priority over the screen-edge fallback. */
export async function resolvePetDrop(
  api: { perch(): Promise<{ ok: boolean; reason?: string }>; peek(): Promise<boolean>; toast(message: string): void },
  current: () => boolean,
): Promise<void> {
  let reason: string | undefined;
  try {
    const result = await api.perch();
    if (!current() || result.ok) return;
    reason = result.reason;
  } catch {
    reason = '窗口停靠暂时失败，请重试；若仍无反应，请重启桌宠。';
  }
  if (!current()) return;
  try {
    if (await api.peek()) return;
  } catch {
    reason ??= '拖拽状态未同步，请重启桌宠后重试。';
  }
  if (current() && reason) api.toast(reason);
}
