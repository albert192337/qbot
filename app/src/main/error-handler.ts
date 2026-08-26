/**
 * 全局错误处理模块：统一捕获主进程的未捕获异常、未处理Promise拒绝等
 */
import { app, dialog } from 'electron';
import { getAgentStatus } from './agent-server';

/**
 * 处理未捕获的同步异常
 */
function handleUncaughtException(error: Error, origin: string): void {
  console.error('[main] 未捕获的异常:', error, '\n起源:', origin);

  // 可以在这里添加错误上报逻辑
  reportErrorToService('uncaughtException', {
    error: error.message,
    stack: error.stack,
    origin,
    agentStatus: getAgentStatus(),
  });

  // 显示错误提示框（开发环境或关键错误）
  if (process.env.NODE_ENV !== 'production' || error.message.includes('fatal')) {
    dialog.showErrorBox('QBot 发生错误', `${error.message}\n\n起源: ${origin}`);
  }
}

/**
 * 处理未处理的Promise拒绝
 */
function handleUnhandledRejection(reason: unknown, promise: Promise<unknown>): void {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  console.error('[main] 未处理的Promise拒绝:', error, '\nPromise:', promise);

  // 可以在这里添加错误上报逻辑
  reportErrorToService('unhandledRejection', {
    error: error.message,
    stack: error.stack,
    promise: String(promise),
  });

  // 拒绝次数过多时退出程序
  const rejectionCount = app.getGPUInfo('basic').then(info => {
    // 简单的拒绝计数逻辑
    return 1;
  });
}

/**
 * 报告错误到外部服务（可扩展）
 */
function reportErrorToService(type: string, data: Record<string, unknown>): void {
  // 这里可以添加错误上报的逻辑，比如发送到日志服务、统计服务等
  // 目前先打印到控制台
  console.log(`[error-report] ${type}:`, JSON.stringify(data, null, 2));
}

/**
 * 初始化全局错误处理
 */
export function initErrorHandler(): void {
  // 捕获未捕获的同步异常
  process.on('uncaughtException', handleUncaughtException);

  // 捕获未处理的Promise拒绝
  process.on('unhandledRejection', handleUnhandledRejection);

  // 捕获Electron的崩溃事件
  app.on('render-process-gone', (event, webContents, details) => {
    console.error('[main] 渲染进程崩溃:', details);
    reportErrorToService('render-process-gone', {
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });

  app.on('child-process-gone', (event, details) => {
    console.error('[main] 子进程崩溃:', details);
    reportErrorToService('child-process-gone', {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
    });
  });
}

/**
 * 清理错误处理监听器
 */
export function cleanupErrorHandler(): void {
  process.removeListener('uncaughtException', handleUncaughtException);
  process.removeListener('unhandledRejection', handleUnhandledRejection);
}