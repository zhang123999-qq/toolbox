/**
 * battery —— 电池信息检测的纯函数层
 *
 * navigator.getBattery 经参数注入（可为字面 mock），node 下可被 vitest 完整测试；
 * 状态描述为纯函数。无 API 时抛中文错。
 */

/** 电池原始信息 */
export interface BatteryRaw {
  readonly level: number
  readonly charging: boolean
  readonly chargingTime: number
  readonly dischargingTime: number
}

/** 可注入的 navigator 形状 */
export interface BatteryNavigatorLike {
  getBattery?: () => Promise<BatteryRaw>
}

/**
 * 读取电池信息。nav 为空或无 getBattery API 时抛中文错。
 * 组件中传入全局 navigator；测试中可注入字面 mock。
 */
export async function getBattery(nav?: BatteryNavigatorLike | null): Promise<BatteryRaw> {
  if (nav == null || typeof nav.getBattery !== 'function') {
    throw new Error('当前浏览器不支持 Battery Status API（仅部分 Chromium 浏览器支持）')
  }
  const b = await nav.getBattery()
  return {
    level: b.level,
    charging: b.charging,
    chargingTime: b.chargingTime,
    dischargingTime: b.dischargingTime,
  }
}

/** 秒数 → 中文时长；Infinity 表示未知 */
function formatMinutes(seconds: number): string {
  if (seconds === Infinity) return '未知'
  return `${Math.max(0, Math.round(seconds / 60))} 分钟`
}

/**
 * 电池状态中文描述，如 "电量 80%（充电中，预计 30 分钟充满）"。
 */
export function batteryStatus(b: BatteryRaw): string {
  const pct = Math.max(0, Math.min(100, Math.round(b.level * 100)))
  if (b.charging) {
    return `电量 ${pct}%（充电中，预计 ${formatMinutes(b.chargingTime)}充满）`
  }
  return `电量 ${pct}%（使用电池，预计可用 ${formatMinutes(b.dischargingTime)}）`
}

/** 电量等级：full/high/medium/low */
export type BatteryLevel = 'full' | 'high' | 'medium' | 'low'

/** 按电量百分比划分等级 */
export function batteryLevel(pct: number): BatteryLevel {
  if (pct >= 100) return 'full'
  if (pct >= 50) return 'high'
  if (pct >= 20) return 'medium'
  return 'low'
}
