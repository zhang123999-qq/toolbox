/**
 * network-info —— 网络信息检测的纯函数层
 *
 * navigator.connection 经参数注入（可为字面 mock），node 下可被 vitest 完整测试；
 * 连接描述为纯函数。无 API 时字段兜底为 unknown，不抛错（信息类工具保持可用）。
 */

/** 可注入的连接对象形状 */
export interface ConnectionLike {
  readonly effectiveType?: string
  readonly downlink?: number
  readonly rtt?: number
  readonly saveData?: boolean
}

/** 可注入的 navigator 形状 */
export interface NetworkNavigatorLike {
  readonly onLine?: boolean
  readonly connection?: ConnectionLike | null
}

/** 网络信息 */
export interface NetworkInfo {
  readonly online: boolean
  readonly effectiveType: string
  readonly downlink: number | null
  readonly rtt: number | null
  readonly saveData: boolean
}

/**
 * 读取网络信息。nav 为空时抛中文错；
 * 无 connection API 时各字段兜底（unknown / null），不抛错。
 */
export function getNetworkInfo(nav?: NetworkNavigatorLike | null): NetworkInfo {
  if (nav == null) {
    throw new Error('当前环境无法获取网络信息，请在浏览器中使用')
  }
  const conn = nav.connection ?? null
  return {
    online: nav.onLine ?? true,
    effectiveType: conn?.effectiveType ?? 'unknown',
    downlink: conn?.downlink ?? null,
    rtt: conn?.rtt ?? null,
    saveData: conn?.saveData ?? false,
  }
}

/** 网络类型中文名 */
export const EFFECTIVE_TYPE_TEXT: Record<string, string> = {
  'slow-2g': '慢速 2G',
  '2g': '2G',
  '3g': '3G',
  '4g': '4G',
  unknown: '未知',
}

/** 网络类型 → 中文（未收录的类型原样返回） */
export function effectiveTypeText(t: string): string {
  return EFFECTIVE_TYPE_TEXT[t] ?? t
}

/**
 * 网络状况中文描述，如 "网络在线，网络类型 4G，下行约 10 Mbps，RTT 50 ms"。
 */
export function describeConnection(n: NetworkInfo): string {
  const parts: string[] = [n.online ? '网络在线' : '网络离线']
  if (n.effectiveType !== 'unknown') {
    parts.push(`网络类型 ${effectiveTypeText(n.effectiveType)}`)
  }
  if (n.downlink != null) {
    parts.push(`下行约 ${n.downlink} Mbps`)
  }
  if (n.rtt != null) {
    parts.push(`RTT ${n.rtt} ms`)
  }
  if (n.saveData) {
    parts.push('已开启省流模式')
  }
  return parts.join('，')
}
