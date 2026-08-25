/**
 * pet 入口分叉二选一：本地宠（AI 状态机全家桶，local-main）
 * 或公共房间宠上屏（?roomPet=1，room-pet-main，spec 2026-08-24）。
 * 同一 renderer 入口复用全部资源加载/样式。
 */
const params = new URLSearchParams(location.search);
if (params.get('roomPet') === '1') {
  void import('./room-pet-main');
} else {
  void import('./local-main');
}
