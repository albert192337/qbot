/**
 * 手动举牌的本地记账：本体牌子显示由渲染端负责（signboard），主进程保存手动牌内容。
 * 公共房间同步的是渲染端最终可见牌面，通过独立的 sign:sync 通道进入 rooms presence。
 */
const SIGN_MAX_LEN = 60;

let localSign: string | null = null;

export function getLocalSign(): string | null {
  return localSign;
}

/** 举牌 / 收牌（null）：折叠空白 + 截断后落地 */
export function setLocalSign(text: string | null): void {
  localSign = text ? text.replace(/\s+/g, ' ').trim().slice(0, SIGN_MAX_LEN) || null : null;
}
