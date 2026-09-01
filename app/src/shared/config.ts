/**
 * 统一配置管理中心
 * 集中管理所有硬编码的参数、超时时间、端口范围等配置
 */

// 环境配置
const env = process.env.NODE_ENV || 'development';
export const isProduction = env === 'production';
export const isDevelopment = env === 'development';

// Agent服务配置
export const AGENT = {
  PORTS: [24242, 24243, 24244, 24245, 24246],
  BODY_LIMIT: 64 * 1024, // 64KB
  STALE_MS: 10 * 60_000, // 10分钟会话超时
  SWEEP_MS: 10_000, // 10秒扫描周期
  TRANSCRIPT_RETRY_MS: 250, // transcript读取重试延迟
  STALE_REPLY_MS: 15_000, // 过期回复判定阈值
  MAX_SESSIONS: 1000, // 最大会话数限制
} as const;

// 公共房间服务配置
export const ROOMS = {
  URL_CHAIN: ['wss://albertbeta.cn/rooms', 'ws://14.103.59.73:24252'] as const,
  CONNECT_TIMEOUT_MS: 8_000,
  REQUEST_TIMEOUT_MS: 8_000,
  PRESENCE_HEARTBEAT_MS: 15_000,
  MAX_PENDING_REQUESTS: 100, // 最大pending请求数限制
  CHAT_CACHE_LIMIT: 50, // 聊天缓存最大条数
  RECONNECT_DELAY: 5000, // 自动重连延迟
} as const;

// 视频处理配置
// 状态机配置
export const STATE_MACHINE = {
  SCHEDULE_MIN_MS: 30_000,
  SCHEDULE_MAX_MS: 180_000,
  AUTO_LOOPS_MIN: 1,
  AUTO_LOOPS_MAX: 3,
} as const;

// 通用配置
export const COMMON = {
  MAX_LOG_LINES: 1000, // 最大日志行数
  DEFAULT_TIMEOUT: 30_000, // 默认超时时间
} as const;

// 从环境变量覆盖配置
export const loadEnvConfig = () => {
  // Agent端口覆盖（AGENT.PORTS 为 readonly 结构，env 覆盖仅影响端口探测的读取顺序，
  // 这里不做可变赋值——直接改 env 无法生效是已知限制，端口探测本身会逐个尝试可用端口）

  // 房间服务URL覆盖（同理，ROOMS.URL_CHAIN 为 readonly；多实例联调走 QBOT_ROOMS_AUTOJOIN）
};

// 初始化加载配置
loadEnvConfig();