/**
 * 渲染进程全局错误处理
 */

// 捕获未捕获的同步异常
window.addEventListener('error', (event) => {
  console.error('[renderer] 未捕获的异常:', event.error, '\n起源:', event.filename, ':', event.lineno, ':', event.colno);

  // 上报错误
  reportErrorToService('uncaughtException', {
    error: event.error?.message,
    stack: event.error?.stack,
    filename: event.filename,
    line: event.lineno,
    column: event.colno,
  });

  // 阻止默认错误处理
  event.preventDefault();
  return true;
});

// 捕获未处理的Promise拒绝
window.addEventListener('unhandledrejection', (event) => {
  console.error('[renderer] 未处理的Promise拒绝:', event.reason);

  // 上报错误
  reportErrorToService('unhandledRejection', {
    reason: String(event.reason),
    promise: String(event.promise),
  });

  // 阻止默认错误处理
  event.preventDefault();
  return true;
});

// 捕获脚本加载错误
window.addEventListener('abort', (event) => {
  console.error('[renderer] 资源加载失败:', event.target);
  reportErrorToService('resource-load-failed', {
    target: String(event.target),
  });
}, true);

/**
 * 报告错误到主进程
 */
function reportErrorToService(type: string, data: Record<string, unknown>): void {
  // 发送到主进程
  if (window.qbot?.error) {
    window.qbot.error.report({ type, ...data });
  }
  // 同时打印到控制台
  console.log(`[error-report] ${type}:`, JSON.stringify(data, null, 2));
}

// 初始化错误处理
export function initRendererErrorHandler(): void {
  console.log('[renderer] 全局错误处理已初始化');
}