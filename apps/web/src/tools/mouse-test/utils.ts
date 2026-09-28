/**
 * mouse-test —— 鼠标检测的纯函数层
 *
 * 按键描述、点击追踪（双击判定）、滚轮方向均为纯函数；
 * mousedown / wheel 监听只在 Tool.tsx 中，可在 node 下被 vitest 完整测试。
 */

/** 按键编号 → 中文名 */
export function describeMouseButton(button: number): string {
  switch (button) {
    case 0:
      return '左键'
    case 1:
      return '中键'
    case 2:
      return '右键'
    default:
      return `按键 ${button}`
  }
}

/** 单次点击记录 */
export interface ClickRecord {
  readonly x: number
  readonly y: number
  readonly button: number
  readonly time: number
}

/** 默认双击判定阈值（毫秒） */
export const DEFAULT_DOUBLE_CLICK_MS = 500

/** 点击记录上限（保留最近 N 条） */
export const MAX_CLICK_RECORDS = 50

export interface TrackClicksResult {
  readonly clicks: readonly ClickRecord[]
  readonly isDouble: boolean
}

/**
 * 记录一次点击并判定是否为双击。
 * @param clicks 历史记录
 * @param e 点击事件的必要字段
 * @param now 当前时间戳（毫秒，可注入以便测试）
 * @param doubleClickMs 双击阈值
 */
export function trackClicks(
  clicks: readonly ClickRecord[],
  e: { readonly button: number; readonly clientX: number; readonly clientY: number },
  now: number,
  doubleClickMs = DEFAULT_DOUBLE_CLICK_MS,
): TrackClicksResult {
  const record: ClickRecord = { x: e.clientX, y: e.clientY, button: e.button, time: now }
  const prev = clicks[clicks.length - 1]
  const isDouble =
    prev !== undefined &&
    prev.button === record.button &&
    now - prev.time >= 0 &&
    now - prev.time <= doubleClickMs
  const next = [...clicks, record]
  return {
    clicks: next.length > MAX_CLICK_RECORDS ? next.slice(next.length - MAX_CLICK_RECORDS) : next,
    isDouble,
  }
}

/** 滚轮 deltaY → 方向文本 */
export function wheelDeltaText(deltaY: number): string {
  if (deltaY > 0) return '向下滚动'
  if (deltaY < 0) return '向上滚动'
  return '无滚动'
}

/** 点击记录 → 可读的一行文本 */
export function formatClickRecord(record: ClickRecord): string {
  return `${describeMouseButton(record.button)} @ (${record.x}, ${record.y})`
}
