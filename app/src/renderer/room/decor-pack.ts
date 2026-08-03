/**
 * 内置装饰贴纸包：gpt-image-2 生成（scripts/gen-room.mts decor 模式），
 * 绿底 colorkey 抠透明 + alpha 包围盒裁边。重新生成后覆盖 decor/*.png 即可。
 */

import type { DecorAnchor } from './decor';

export interface DecorSticker {
  id: string;
  name: string;
  image: string;
  /** 默认显示宽度（房间坐标 px，scale=1 时；1024 坐标系） */
  defaultW: number;
  /**
   * 锚定方式：挂画/灯笼/圆窗/挂钟/折扇/卷轴是挂在墙上的，吃墙面仿射；
   * 盆栽/书架/屏风/案几是站在地面上的，不变形且参与与角色的深度遮挡。
   */
  anchor: DecorAnchor;
  /** 托盘分组 */
  category: '墙面' | '家具';
  /**
   * 图片宽高比（高/宽）。显示高度 = defaultW × aspect。
   * 必须是数据而不是注释：地面家具的足迹要靠它算底边位置，
   * 而足迹计算是纯函数（不能在运行时读 img.naturalHeight）。
   */
  aspect: number;
}

const img = (name: string) => new URL(`./decor/${name}.png`, import.meta.url).href;

/**
 * v3 水彩素材的 defaultW 按「相对角色身高」定：角色 petHeight 230、可见高约 156px，
 * 所以屏风/书架略高于角色（~190），案几矮（~70），挂件 90~150。
 * 每件的高度由图片固有宽高比决定，下面注释标的是换算后的实际显示高度。
 */
export const DECOR_PACK: DecorSticker[] = [
  // 墙面挂件
  { id: 'painting', name: '山水挂画', image: img('painting'), defaultW: 91, anchor: 'wall', category: '墙面', aspect: 1.431 },      // 757x1083 → 高 130
  { id: 'lantern', name: '灯笼', image: img('lantern'), defaultW: 84, anchor: 'wall', category: '墙面', aspect: 1.550 },            // 787x1220 → 高 130
  { id: 'window', name: '圆窗', image: img('window'), defaultW: 149, anchor: 'wall', category: '墙面', aspect: 1.006 },             // 1137x1144 → 高 150
  { id: 'clock', name: '挂钟', image: img('clock'), defaultW: 90, anchor: 'wall', category: '墙面', aspect: 1.003 },                // 1014x1017 → 高 90
  { id: 'fan', name: '折扇', image: img('fan'), defaultW: 113, anchor: 'wall', category: '墙面', aspect: 0.796 },                   // 1254x998 → 高 90
  { id: 'calligraphy', name: '字画卷轴', image: img('calligraphy'), defaultW: 67, anchor: 'wall', category: '墙面', aspect: 2.703 }, // 458x1238 → 高 180
  // 地面家具（参与与角色的深度遮挡）
  { id: 'screen', name: '屏风', image: img('screen'), defaultW: 165, anchor: 'floor', category: '家具', aspect: 1.153 },            // 909x1048 → 高 190
  { id: 'shelf', name: '书架', image: img('shelf'), defaultW: 92, anchor: 'floor', category: '家具', aspect: 1.948 },               // 553x1077 → 高 180
  { id: 'plant', name: '盆栽', image: img('plant'), defaultW: 99, anchor: 'floor', category: '家具', aspect: 1.206 },               // 975x1176 → 高 120
  { id: 'teapot', name: '茶壶案几', image: img('teapot'), defaultW: 84, anchor: 'floor', category: '家具', aspect: 0.836 },         // 1028x859 → 高 70
];

export const DECOR_BY_ID: ReadonlyMap<string, DecorSticker> = new Map(
  DECOR_PACK.map((s) => [s.id, s]),
);

/** 取贴纸锚定方式（未知 id 当墙面处理，与 sanitizePlacements 的宽容策略一致） */
export function anchorOf(stickerId: string): DecorAnchor {
  return DECOR_BY_ID.get(stickerId)?.anchor ?? 'wall';
}
