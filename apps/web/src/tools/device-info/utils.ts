/**
 * device-info —— 设备信息检测的纯函数层
 *
 * navigator 经参数注入（可为字面对象），node 下可被 vitest 完整测试；
 * 设备类型判断为纯 UA 字符串函数。
 */

/** 设备类型 */
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

/** 设备类型的中文名 */
export const DEVICE_TYPE_TEXT: Record<DeviceType, string> = {
  mobile: '手机',
  tablet: '平板',
  desktop: '桌面',
}

/**
 * 由 UA 判断设备类型。平板规则优先于手机（iPad 的 UA 可能同时含 Mobile）。
 */
export function deviceType(ua: string): DeviceType {
  if (/iPad|Tablet|PlayBook|Nexus 7|Nexus 9|SM-T\d/i.test(ua)) return 'tablet'
  if (/Mobi|Android|iPhone|iPod|Phone|BlackBerry|IEMobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

/** 可注入的 navigator 形状 */
export interface NavigatorLike {
  readonly platform?: string
  readonly hardwareConcurrency?: number
  readonly deviceMemory?: number
  readonly userAgent?: string
  readonly language?: string
  readonly maxTouchPoints?: number
  readonly onLine?: boolean
  readonly userAgentData?: { mobile?: boolean }
}

/** 设备信息 */
export interface DeviceInfo {
  readonly platform: string
  readonly cores: number
  readonly memoryGB: number | null
  readonly mobileHint: boolean
  readonly language: string
  readonly touch: boolean
  readonly type: DeviceType
  readonly typeText: string
}

/**
 * 读取设备信息。navigator 为空时抛中文错；
 * 各字段缺失时用合理兜底（unknown / 0 / null），不抛错。
 */
export function getDeviceInfo(nav?: NavigatorLike | null): DeviceInfo {
  if (nav == null) {
    throw new Error('当前环境无法获取设备信息，请在浏览器中使用')
  }
  const ua = nav.userAgent ?? ''
  const type = deviceType(ua)
  return {
    platform: nav.platform ?? 'unknown',
    cores: nav.hardwareConcurrency ?? 0,
    memoryGB: nav.deviceMemory ?? null,
    mobileHint: nav.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPod/i.test(ua),
    language: nav.language ?? 'unknown',
    touch: (nav.maxTouchPoints ?? 0) > 0,
    type,
    typeText: DEVICE_TYPE_TEXT[type],
  }
}
