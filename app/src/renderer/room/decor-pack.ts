/**
 * 内置装饰贴纸包：gpt-image-2 生成（scripts/gen-room.mts decor 模式），
 * 绿底 colorkey 抠透明 + alpha 包围盒裁边。重新生成后覆盖 decor/*.png 即可。
 */

export interface DecorSticker {
  id: string;
  name: string;
  image: string;
  /** 默认显示宽度（房间坐标 px，scale=1 时；1024 坐标系） */
  defaultW: number;
}

const img = (name: string) => new URL(`./decor/${name}.png`, import.meta.url).href;

export const DECOR_PACK: DecorSticker[] = [
  { id: 'painting', name: '山水挂画', image: img('painting'), defaultW: 150 },
  { id: 'lantern', name: '红灯笼', image: img('lantern'), defaultW: 110 },
  { id: 'plant', name: '盆栽', image: img('plant'), defaultW: 130 },
  { id: 'window', name: '圆窗', image: img('window'), defaultW: 180 },
  { id: 'clock', name: '挂钟', image: img('clock'), defaultW: 110 },
  { id: 'shelf', name: '书架', image: img('shelf'), defaultW: 200 },
  { id: 'screen', name: '屏风', image: img('screen'), defaultW: 230 },
  { id: 'teapot', name: '茶壶案几', image: img('teapot'), defaultW: 180 },
  { id: 'fan', name: '折扇', image: img('fan'), defaultW: 150 },
  { id: 'calligraphy', name: '字画卷轴', image: img('calligraphy'), defaultW: 100 },
];

export const DECOR_BY_ID: ReadonlyMap<string, DecorSticker> = new Map(
  DECOR_PACK.map((s) => [s.id, s]),
);
