import { useState } from 'react'
import { meta } from './meta'
import { listUsbDevices, requestUSBDevice, supportsUSB } from './utils'
import type { UsbDeviceInfo, UsbNavigatorLike } from './utils'

const BTN_CLASS =
  'rounded border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'

/**
 * USB 测试：检测 WebUSB 能力，请求新设备或列出已授权设备；
 * 全部调用注入 navigator.usb；API 缺失或用户取消时中文提示。
 */
export default function Tool() {
  const [devices, setDevices] = useState<UsbDeviceInfo[]>([])
  const [error, setError] = useState('')
  const [hint, setHint] = useState('')

  function reset(): void {
    setError('')
    setHint('')
  }

  async function connect(): Promise<void> {
    reset()
    try {
      const nav = navigator as unknown as UsbNavigatorLike
      if (!supportsUSB(nav)) {
        setError('当前浏览器不支持 WebUSB（需要 Chrome/Edge 等 HTTPS 环境）')
        return
      }
      const info = await requestUSBDevice(nav.usb)
      setDevices([info])
      setHint('已选择设备，如需查看多个设备请使用"列出已授权设备"')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'USB 请求失败')
    }
  }

  async function list(): Promise<void> {
    reset()
    setDevices([])
    try {
      const nav = navigator as unknown as UsbNavigatorLike
      const granted = await listUsbDevices(nav.usb)
      setDevices(granted)
      if (granted.length === 0) setHint('暂无已授权的 USB 设备（仅列出已授权设备）')
    } catch (e) {
      setError(e instanceof Error ? e.message : '读取授权设备失败')
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button type="button" className={BTN_CLASS} data-testid="usb-connect" onClick={connect}>
          请求 USB 设备
        </button>
        <button type="button" className={BTN_CLASS} data-testid="usb-list" onClick={list}>
          列出已授权设备
        </button>
      </div>
      {devices.length > 0 && (
        <ul className="space-y-1 text-sm" data-testid="usb-devices">
          {devices.map((d, i) => (
            <li key={`${d.vendorId}-${d.productId}-${i}`} className="flex items-center gap-2">
              <span className="font-medium">{d.name}</span>
              <span className="text-xs text-slate-400">
                {d.vendorId}:{d.productId}
              </span>
            </li>
          ))}
        </ul>
      )}
      {hint && (
        <p className="text-sm text-slate-500" data-testid="usb-hint">
          {hint}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-600" data-testid="usb-error">
          {error}
        </p>
      )}
      <p className="text-xs text-slate-400">
        需要 HTTPS 环境并在用户手势中调用；仅列出已授权的设备，未授权时如实提示。工具信息：{meta.title}（#869）
      </p>
    </div>
  )
}
