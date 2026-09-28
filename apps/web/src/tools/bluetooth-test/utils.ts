/**
 * bluetooth-test —— 蓝牙测试的纯函数层
 *
 * navigator.bluetooth 经参数注入（可为字面 mock）；
 * 设备名解析、ID 简写均为纯函数。
 * 无 API 时抛中文错（HTTPS + 用户手势 + 支持的浏览器才可用）。
 */

/** 可注入的 navigator 形状 */
export interface BluetoothNavigatorLike {
  bluetooth?: {
    requestDevice?: (options?: Record<string, unknown>) => Promise<BluetoothDeviceLike>
    getDevices?: () => Promise<BluetoothDeviceLike[]>
  }
}

/** 可注入的蓝牙设备形状 */
export interface BluetoothDeviceLike {
  id?: string
  name?: string | null
}

/** 简写后的设备信息 */
export interface BluetoothDeviceInfo {
  readonly id: string
  readonly name: string
  readonly shortId: string
}

/** 是否支持 Web Bluetooth（navigator.bluetooth 存在即认为支持） */
export function supportsBluetooth(nav?: BluetoothNavigatorLike | null): boolean {
  return nav != null && nav.bluetooth != null
}

/**
 * 请求蓝牙设备（触发浏览器选择器，需要用户手势）。
 * 无 API 或 requestDevice 缺失时抛中文错。
 */
export async function requestDevice(
  bt?: { requestDevice?: (options?: Record<string, unknown>) => Promise<BluetoothDeviceLike> } | null,
  options: Record<string, unknown> = { acceptAllDevices: true },
): Promise<BluetoothDeviceInfo> {
  if (bt == null || typeof bt.requestDevice !== 'function') {
    throw new Error('当前浏览器不支持 Web Bluetooth（需要 Chrome/Edge 等支持 HTTPS 环境）')
  }
  const device = await bt.requestDevice(options)
  return toDeviceInfo(device)
}

/**
 * 列出已配对设备（getDevices 不存在时抛中文错，
 * 仅返回已授权的设备，未授权时如实返回空数组）。
 */
export async function listPairedDevices(
  bt?: { getDevices?: () => Promise<BluetoothDeviceLike[]> } | null,
): Promise<BluetoothDeviceInfo[]> {
  if (bt == null || typeof bt.getDevices !== 'function') {
    throw new Error('当前浏览器不支持列出已配对蓝牙设备（getDevices 不可用）')
  }
  const devices = await bt.getDevices()
  return devices.map(toDeviceInfo)
}

/** 设备名解析：null/空 → "未知设备" */
export function parseDeviceName(device?: BluetoothDeviceLike | null): string {
  const name = device?.name
  if (name == null || name.trim() === '') return '未知设备'
  return name.trim()
}

/** ID 简写：取前 8 位 + 省略号，短 ID 保持原样 */
export function deviceIdShort(device?: BluetoothDeviceLike | null): string {
  const id = device?.id ?? ''
  if (id === '') return '无 ID'
  if (id.length <= 12) return id
  return `${id.slice(0, 8)}…`
}

/** 转为展示用信息 */
export function toDeviceInfo(device?: BluetoothDeviceLike | null): BluetoothDeviceInfo {
  const id = device?.id ?? ''
  return {
    id,
    name: parseDeviceName(device),
    shortId: deviceIdShort(device),
  }
}
