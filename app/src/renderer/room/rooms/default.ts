/**
 * 默认房间：代码手绘 SVG 等距小屋，配色对齐「玉缘斋」参考图
 * （两面暖色墙 + 菱形木地板 + 红木柜 + 挂画）。
 * 内联字符串走 data URL，避免给 renderer 引入资产类型声明依赖；换真 PNG 时改 background 即可。
 */
import type { RoomSpec } from './types';

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800">
  <g stroke="#7b4433" stroke-width="6" stroke-linejoin="round">
    <!-- 墙体 -->
    <polygon points="80,490 400,330 400,80 80,240" fill="#f6ecd4"/>
    <polygon points="400,330 720,490 720,240 400,80" fill="#f1e4c6"/>
    <!-- 墙面上部深色带（参考图的顶部深棕区） -->
    <polygon points="80,240 400,80 400,150 80,310" fill="#6d5c50"/>
    <polygon points="400,80 720,240 720,310 400,150" fill="#645449"/>
    <!-- 地板 -->
    <polygon points="400,330 720,490 400,650 80,490" fill="#dcbd90"/>
  </g>
  <!-- 地板木纹（不描边组） -->
  <g stroke="#bb9060" stroke-width="3">
    <line x1="464" y1="362" x2="144" y2="522"/>
    <line x1="528" y1="394" x2="208" y2="554"/>
    <line x1="592" y1="426" x2="272" y2="586"/>
    <line x1="656" y1="458" x2="336" y2="618"/>
    <line x1="300" y1="455" x2="372" y2="491"/>
    <line x1="480" y1="480" x2="552" y2="516"/>
    <line x1="380" y1="560" x2="452" y2="596"/>
  </g>
  <!-- 踢脚线 -->
  <g stroke="#7b4433" stroke-width="4">
    <polygon points="80,490 400,330 400,344 80,504" fill="#e9d3a8"/>
    <polygon points="400,330 720,490 720,504 400,344" fill="#e4cb9c"/>
  </g>
  <!-- 角柱 -->
  <rect x="392" y="80" width="16" height="258" fill="#c0574a" stroke="#7b4433" stroke-width="4"/>
  <!-- 左墙红木柜 -->
  <g stroke="#7b4433" stroke-width="5" stroke-linejoin="round">
    <polygon points="112,474 304,378 304,188 112,284" fill="#cd6f52"/>
    <line x1="112" y1="344" x2="304" y2="248"/>
    <line x1="112" y1="309" x2="304" y2="213"/>
    <polygon points="122,454 173,429 173,339 122,364" fill="#b85a40"/>
    <polygon points="182,424 234,398 234,308 182,334" fill="#b85a40"/>
    <polygon points="243,393 294,368 294,278 243,303" fill="#b85a40"/>
  </g>
  <g fill="#e8c46a" stroke="#7b4433" stroke-width="3">
    <circle cx="147" cy="396" r="6"/>
    <circle cx="208" cy="366" r="6"/>
    <circle cx="269" cy="335" r="6"/>
  </g>
  <!-- 右墙挂画 -->
  <g stroke-linejoin="round">
    <polygon points="560,280 650,325 650,220 560,175" fill="#b04a3a" stroke="#7b4433" stroke-width="5"/>
    <polygon points="572,270 638,303 638,230 572,197" fill="#f4f7ee" stroke="#7b4433" stroke-width="3"/>
    <circle cx="600" cy="258" r="13" fill="#eed9b4" stroke="#cfa76a" stroke-width="3"/>
    <circle cx="614" cy="240" r="11" fill="#eed9b4" stroke="#cfa76a" stroke-width="3"/>
    <circle cx="592" cy="236" r="9" fill="#eed9b4" stroke="#cfa76a" stroke-width="3"/>
  </g>
</svg>`;

export const DEFAULT_ROOM: RoomSpec = {
  name: 'default',
  background: `data:image/svg+xml;utf8,${encodeURIComponent(SVG)}`,
  width: 800,
  height: 800,
  // 地板菱形（330/650 上下顶点）内收一圈，留出踢脚线和角色脚底余量
  floor: [
    [400, 390],
    [640, 510],
    [400, 620],
    [160, 510],
  ],
  scaleNear: 1,
  scaleFar: 0.62,
  petHeight: 230,
};
