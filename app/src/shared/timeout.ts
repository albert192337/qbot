/**
 * 超时工具函数：为异步操作添加超时保护
 */

/**
 * 为异步函数添加超时保护
 * @param fn 要执行的异步函数
 * @param timeoutMs 超时时间（毫秒）
 * @param timeoutError 超时错误信息
 * @returns 包装后的异步函数
 */
export function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  timeoutError: string = '操作超时'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new Error(timeoutError));
    }, timeoutMs);

    fn()
      .then((result) => {
        clearTimeout(timeoutId);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}

/**
 * 延迟执行
 * @param ms 延迟时间（毫秒）
 * @returns Promise
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 带重试的异步操作
 * @param fn 要执行的异步函数
 * @param retries 重试次数
 * @param delayMs 重试间隔（毫秒）
 * @param shouldRetry 判断是否应该重试的函数
 * @returns 最终结果
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delayMs: number = 1000,
  shouldRetry?: (error: unknown) => boolean
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最后一次尝试，抛出错误
      if (i >= retries) {
        break;
      }

      // 如果指定了shouldRetry，且返回false，则不重试
      if (shouldRetry && !shouldRetry(error)) {
        break;
      }

      // 等待重试间隔
      await delay(delayMs);
    }
  }

  throw lastError;
}