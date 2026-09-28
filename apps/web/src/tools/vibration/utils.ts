/**
 * vibration —— 震动测试的纯函数层
 *
 * navigator.vibrate 经参数注入（可为字面 mock）；
 * 预设模式与模式描述均为纯函数。
 * 无 API 时抛中文错（多为移动设备支持）。
 */

/** 可注入的 navigator 形状 */
export interface VibrateNavigatorLike {
  vibrate?: (pattern: number | readonly number[]) => boolean
}

/** 震动预设 */
export interface VibratePattern {
  readonly label: string
  readonly pattern: readonly number[]
}

/** 内置预设模式（数字为毫秒，间隔交替为停顿） */
export const PATTERNS: Record<string, VibratePattern> = {
  short: { label: '短震', pattern: [80] },
  long: { label: '长震', pattern: [400] },
  double: { label: '双震', pattern: [120, 100, 120] },
  sos: { label: 'SOS', pattern: [80, 80, 80, 200, 400, 200, 80, 80, 80] },
}

/** 模式中文描述，如 "震动 80 毫秒" / "震动序列：120/100/120 毫秒" */
export function describePattern(pattern: readonly number[]): string {
  if (pattern.length === 0) return '空模式'
  if (pattern.length === 1) return `震动 ${pattern[0]} 毫秒`
  return `震动序列：${pattern.join('/')} 毫秒`
}

/**
 * 触发震动，返回浏览器是否成功启动震动。
 * nav 为空或无 vibrate 函数时抛中文错。
 * 组件中传入全局 navigator；测试中可注入字面 mock。
 */
export function vibrate(
  nav?: VibrateNavigatorLike | null,
  pattern: number | readonly number[] = 80,
): boolean {
  if (nav == null || typeof nav.vibrate !== 'function') {
    throw new Error('当前浏览器不支持 Vibration API（多为移动设备浏览器支持）')
  }
  return nav.vibrate(pattern)
}
