/**
 * pet 入口分叉：本地宠（AI 状态机全家桶，local-main）
 * 或联机远端宠（?remote=1，NetworkDriver 收帧驱动，remote-main）。
 * 同一 renderer 入口复用全部资源加载/样式，见 spec 2026-08-02 §二.3。
 */
const isRemote = new URLSearchParams(location.search).get('remote') === '1';
if (isRemote) {
  void import('./remote-main');
} else {
  void import('./local-main');
}
