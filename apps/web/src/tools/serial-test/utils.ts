/**
 * serial-test —— 串口测试的纯函数层
 *
 * navigator.serial 经参数注入（可为字面 mock）；
 * 波特率表、端口信息描述、打开/关闭封装均为纯函数或可注入的薄封装。
 * 无 API 时抛中文错（HTTPS + 用户手势 + 支持的浏览器才可用）。
 */

/** 可注入的 navigator 形状 */
export interface SerialNavigatorLike {
  serial?: {
    requestPort?: (options?: Record<string, unknown>) => Promise<SerialPortLike>
    getPorts?: () => Promise<SerialPortLike[]>
  }
}

/** 可注入的串口形状 */
export interface SerialPortLike {
  getInfo?: () => { usbVendorId?: number; usbProductId?: number }
  open?: (options?: { baudRate?: number }) => Promise<void>
  close?: () => Promise<void>
  readable?: unknown
  writable?: unknown
}

/** 端口展示信息 */
export interface SerialPortInfo {
  readonly label: string
  readonly usbVendorId: string
  readonly usbProductId: string
}

/** 标准波特率表（常用值） */
export const baudRates: readonly number[] = [
  9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600,
]

/** 是否支持 Web Serial（navigator.serial 存在即认为支持） */
export function supportsSerial(nav?: SerialNavigatorLike | null): boolean {
  return nav != null && nav.serial != null
}

/**
 * 请求串口（触发浏览器选择器，需要用户手势）。
 * 无 API 或 requestPort 缺失时抛中文错。
 */
export async function requestPort(
  serial?: { requestPort?: (options?: Record<string, unknown>) => Promise<SerialPortLike> } | null,
  options: Record<string, unknown> = {},
): Promise<SerialPortLike> {
  if (serial == null || typeof serial.requestPort !== 'function') {
    throw new Error('当前浏览器不支持 Web Serial（需要 Chrome/Edge 等 HTTPS 环境）')
  }
  return serial.requestPort(options)
}

/**
 * 列出已授权端口（getPorts 不存在时抛中文错，
 * 仅返回已授权的端口，未授权时如实返回空数组）。
 */
export async function listPorts(
  serial?: { getPorts?: () => Promise<SerialPortLike[]> } | null,
): Promise<SerialPortLike[]> {
  if (serial == null || typeof serial.getPorts !== 'function') {
    throw new Error('当前浏览器不支持列出已授权串口（getPorts 不可用）')
  }
  return serial.getPorts()
}

/**
 * 端口信息描述：usbVendorId/usbProductId → 十六进制；
 * label 为 "串口 #N（0xVVVV:0xPPPP）"，无信息时为 "串口 #N"。
 */
export function describePort(
  port?: SerialPortLike | null,
  index = 0,
): SerialPortInfo {
  const info = port?.getInfo?.()
  const base = `串口 #${index + 1}`
  if (info == null) {
    return { label: base, usbVendorId: '0x0000', usbProductId: '0x0000' }
  }
  const vendorId = hex4(info.usbVendorId)
  const productId = hex4(info.usbProductId)
  return {
    label: `${base}（${vendorId}:${productId}）`,
    usbVendorId: vendorId,
    usbProductId: productId,
  }
}

/** 数字 → 0xXXXX（4 位大写十六进制），无效数字 → 0x0000 */
export function hex4(n?: number | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '0x0000'
  return `0x${(Math.floor(n) & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * 打开端口（波特率可配置）。open 缺失时抛中文错。
 * 打开失败时浏览器抛出的错误如实透出。
 */
export async function openPort(
  port?: SerialPortLike | null,
  baudRate = 9600,
): Promise<void> {
  if (port == null || typeof port.open !== 'function') {
    throw new Error('当前串口对象不支持打开（open 不可用）')
  }
  await port.open({ baudRate })
}

/** 关闭端口。close 缺失时抛中文错。 */
export async function closePort(port?: SerialPortLike | null): Promise<void> {
  if (port == null || typeof port.close !== 'function') {
    throw new Error('当前串口对象不支持关闭（close 不可用）')
  }
  await port.close()
}
