/**
 * 手动举牌的本地记账：本体牌子显示由渲染端负责（signboard），主进程只存当前文字。
 * （曾经 1v1 联机时还要同步对端替身；联机退役后这是纯本地状态，无网络出口。）
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
