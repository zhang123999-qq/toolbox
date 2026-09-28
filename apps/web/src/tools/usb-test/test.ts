/**
 * usb-test 工具测试（#869）：navigator.usb 经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import { listUsbDevices, parseUSBDevice, requestUSBDevice, supportsUSB, usbIdHex } from './utils'

describe('usb-test · supportsUSB', () => {
  it('navigator 为空或无 usb 时返回 false', () => {
    expect(supportsUSB(null)).toBe(false)
    expect(supportsUSB(undefined)).toBe(false)
    expect(supportsUSB({})).toBe(false)
  })

  it('有 usb 时返回 true', () => {
    expect(supportsUSB({ usb: {} })).toBe(true)
  })
})

describe('usb-test · usbIdHex', () => {
  it('常规数字格式化', () => {
    expect(usbIdHex(0x1234)).toBe('0x1234')
    expect(usbIdHex(0x0)).toBe('0x0000')
    expect(usbIdHex(0xffff)).toBe('0xFFFF')
  })

  it('自动补零', () => {
    expect(usbIdHex(0xa)).toBe('0x000A')
  })

  it('小数向下取整并只取低 16 位', () => {
    expect(usbIdHex(0x1234 + 0.9)).toBe('0x1234')
    expect(usbIdHex(0x11234)).toBe('0x1234')
  })

  it('无效数字 → 0x0000', () => {
    expect(usbIdHex(undefined)).toBe('0x0000')
    expect(usbIdHex(null)).toBe('0x0000')
    expect(usbIdHex(Number.NaN)).toBe('0x0000')
    expect(usbIdHex(Number.POSITIVE_INFINITY)).toBe('0x0000')
    expect(usbIdHex(-1)).toBe('0x0000')
  })
})

describe('usb-test · parseUSBDevice', () => {
  it('完整字段', () => {
    expect(
      parseUSBDevice({ vendorId: 0x2341, productId: 0x0043, productName: 'Arduino Uno' }),
    ).toEqual({ vendorId: '0x2341', productId: '0x0043', name: 'Arduino Uno' })
  })

  it('无产品名时用厂商名', () => {
    const info = parseUSBDevice({ vendorId: 1, productId: 2, manufacturerName: 'ACME' })
    expect(info.name).toBe('ACME')
  })

  it('全缺时 → 未知 USB 设备', () => {
    expect(parseUSBDevice(null)).toEqual({
      vendorId: '0x0000',
      productId: '0x0000',
      name: '未知 USB 设备',
    })
  })

  it('空白名称被忽略', () => {
    const info = parseUSBDevice({ productName: '   ' })
    expect(info.name).toBe('未知 USB 设备')
  })
})

describe('usb-test · requestUSBDevice', () => {
  it('透传 options 并返回设备信息', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const usb = {
      requestDevice: vi.fn(async (o?: Record<string, unknown>) => {
        seen.push(o)
        return { vendorId: 0x2341, productId: 0x0043, productName: 'Arduino' }
      }),
    }
    const info = await requestUSBDevice(usb, { filters: [{ vendorId: 0x2341 }] })
    expect(seen[0]).toEqual({ filters: [{ vendorId: 0x2341 }] })
    expect(info).toEqual({ vendorId: '0x2341', productId: '0x0043', name: 'Arduino' })
  })

  it('默认 options 为空 filters', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const usb = {
      requestDevice: vi.fn(async (o?: Record<string, unknown>) => {
        seen.push(o)
        return {}
      }),
    }
    await requestUSBDevice(usb)
    expect(seen[0]).toEqual({ filters: [] })
  })

  it('无 API 时抛中文错', async () => {
    await expect(requestUSBDevice(null)).rejects.toThrow('不支持 WebUSB')
    await expect(requestUSBDevice(undefined)).rejects.toThrow('不支持 WebUSB')
    await expect(requestUSBDevice({})).rejects.toThrow('不支持 WebUSB')
  })
})

describe('usb-test · listUsbDevices', () => {
  it('返回已授权设备列表', async () => {
    const usb = {
      getDevices: vi.fn(async () => [
        { vendorId: 0x2341, productId: 0x0043, productName: 'Arduino' },
        { vendorId: 0x05ac, productId: 0x1234 },
      ]),
    }
    const list = await listUsbDevices(usb)
    expect(list).toHaveLength(2)
    expect(list[0]?.vendorId).toBe('0x2341')
    expect(list[1]?.name).toBe('未知 USB 设备')
  })

  it('未授权时返回空数组', async () => {
    const usb = { getDevices: vi.fn(async () => []) }
    expect(await listUsbDevices(usb)).toEqual([])
  })

  it('无 getDevices 时抛中文错', async () => {
    await expect(listUsbDevices(null)).rejects.toThrow('getDevices 不可用')
    await expect(listUsbDevices({})).rejects.toThrow('getDevices 不可用')
  })
})
