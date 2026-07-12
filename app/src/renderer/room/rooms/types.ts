/** 房间资产格式：v1 打进 renderer bundle；将来串门/联机需要动态房间时序列化为 room.json 外置 */

export interface RoomSpec {
  name: string;
  /** 背景图 URL（data URL / vite 资产均可） */
  background: string;
  /** 背景图设计尺寸（floor 坐标的参考系） */
  width: number;
  height: number;
  /** 地板可行走区多边形（背景图坐标系，顺时针，凸多边形） */
  floor: Array<[number, number]>;
  /** 房间实体外轮廓（透明贴纸窗：轮廓外穿透点击、隐藏悬停控件） */
  outline: Array<[number, number]>;
  /** 左/右墙面区域（装饰 drop 判定用） */
  wallL: Array<[number, number]>;
  wallR: Array<[number, number]>;
  /** 左/右墙贴合变形（CSS matrix 的 a,b,c,d；等距墙面是仿射变换，无需 3D） */
  wallMatrixL: [number, number, number, number];
  wallMatrixR: [number, number, number, number];
  /** 角色在地板最下缘的缩放（近处） */
  scaleNear: number;
  /** 角色在地板最上缘的缩放（远处） */
  scaleFar: number;
  /** 角色显示基准边长 px（缩放 1.0 时；动作视频为方形） */
  petHeight: number;
}
