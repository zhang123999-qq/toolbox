/**
 * usb-test —— USB 测试的纯函数层
 *
 * navigator.usb 经参数注入（可为字面 mock）；
 * 厂商/产品 ID 的十六进制格式化、设备解析均为纯函数。
 * 无 API 时抛中文错（HTTPS + 用户手势 + 支持的浏览器才可用）。
 */

/** 可注入的 navigator 形状 */
export interface UsbNavigatorLike {
  usb?: {
    requestDevice?: (options?: Record<string, unknown>) => Promise<UsbDeviceLike>
    getDevices?: () => Promise<UsbDeviceLike[]>
  }
}

/** 可注入的 USB 设备形状 */
export interface UsbDeviceLike {
  vendorId?: number
  productId?: number
  productName?: string
  manufacturerName?: string
}

/** 简写后的设备信息 */
export interface UsbDeviceInfo {
  readonly vendorId: string
  readonly productId: string
  readonly name: string
}

/** 是否支持 WebUSB（navigator.usb 存在即认为支持） */
export function supportsUSB(nav?: UsbNavigatorLike | null): boolean {
  return nav != null && nav.usb != null
}

/** 数字格式化为 4 位大写十六进制，如 0x1234；无效数字 → 0x0000 */
export function usbIdHex(n?: number | null): string {
  if (typeof n !== 'number' || !Number.isFinite(n) || n < 0) return '0x0000'
  const v = Math.floor(n) & 0xffff
  return `0x${v.toString(16).toUpperCase().padStart(4, '0')}`
}

/**
 * 请求 USB 设备（触发浏览器选择器，需要用户手势）。
 * 无 API 或 requestDevice 缺失时抛中文错。
 */
export async function requestUSBDevice(
  usb?: { requestDevice?: (options?: Record<string, unknown>) => Promise<UsbDeviceLike> } | null,
  options: Record<string, unknown> = { filters: [] },
): Promise<UsbDeviceInfo> {
  if (usb == null || typeof usb.requestDevice !== 'function') {
    throw new Error('当前浏览器不支持 WebUSB（需要 Chrome/Edge 等 HTTPS 环境）')
  }
  const device = await usb.requestDevice(options)
  return parseUSBDevice(device)
}

/**
 * 列出已授权设备（getDevices 不存在时抛中文错，
 * 仅返回已授权的设备，未授权时如实返回空数组）。
 */
export async function listUsbDevices(
  usb?: { getDevices?: () => Promise<UsbDeviceLike[]> } | null,
): Promise<UsbDeviceInfo[]> {
  if (usb == null || typeof usb.getDevices !== 'function') {
    throw new Error('当前浏览器不支持列出已授权 USB 设备（getDevices 不可用）')
  }
  const devices = await usb.getDevices()
  return devices.map(parseUSBDevice)
}

/**
 * USB 设备解析：vendorId/productId → 十六进制；
 * 名称优先 productName，其次 manufacturerName，否则 "未知 USB 设备"。
 */
export function parseUSBDevice(device?: UsbDeviceLike | null): UsbDeviceInfo {
  const name =
    device?.productName?.trim() ||
    device?.manufacturerName?.trim() ||
    '未知 USB 设备'
  return {
    vendorId: usbIdHex(device?.vendorId),
    productId: usbIdHex(device?.productId),
    name,
  }
}
