/**
 * screen-capture 纯函数：支持检测、错误映射、文件名构造。
 * 不触碰 DOM / navigator（检测器由参数注入），可 100% 单测。
 */

/** 是否支持屏幕捕获：检测器由调用方以 boolean 注入，便于单测 */
export function getSupportError(hasApi: boolean): 'unsupported' | null {
  return hasApi ? null : 'unsupported'
}

/**
 * getDisplayMedia 错误映射（对标 screen-record 的映射口径）：
 * NotAllowedError → denied（用户拒绝/取消授权）；
 * NotFoundError / OverconstrainedError → notfound（无可共享目标）；
 * 其他 → failed。
 */
export function mapCaptureError(err: unknown): 'denied' | 'notfound' | 'failed' {
  const name = err instanceof DOMException ? err.name : err instanceof Error ? err.name : ''
  if (name === 'NotAllowedError') return 'denied'
  if (name === 'NotFoundError' || name === 'OverconstrainedError') return 'notfound'
  return 'failed'
}

/** 构造输出文件名：screen-capture-<时间戳>.png（时间戳由参数注入，便于单测） */
export function buildOutputFileName(timestamp: number): string {
  return `screen-capture-${timestamp}.png`
}
