/**
 * serial-test 工具测试（#870）：navigator.serial 经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  baudRates,
  closePort,
  describePort,
  hex4,
  listPorts,
  openPort,
  requestPort,
  supportsSerial,
} from './utils'

describe('serial-test · supportsSerial', () => {
  it('navigator 为空或无 serial 时返回 false', () => {
    expect(supportsSerial(null)).toBe(false)
    expect(supportsSerial(undefined)).toBe(false)
    expect(supportsSerial({})).toBe(false)
  })

  it('有 serial 时返回 true', () => {
    expect(supportsSerial({ serial: {} })).toBe(true)
  })
})

describe('serial-test · hex4', () => {
  it('常规数字格式化', () => {
    expect(hex4(0x2341)).toBe('0x2341')
    expect(hex4(0)).toBe('0x0000')
    expect(hex4(0xa)).toBe('0x000A')
  })

  it('只取低 16 位', () => {
    expect(hex4(0x11234)).toBe('0x1234')
  })

  it('无效数字 → 0x0000', () => {
    expect(hex4(undefined)).toBe('0x0000')
    expect(hex4(null)).toBe('0x0000')
    expect(hex4(Number.NaN)).toBe('0x0000')
    expect(hex4(Number.POSITIVE_INFINITY)).toBe('0x0000')
    expect(hex4(-1)).toBe('0x0000')
  })
})

describe('serial-test · describePort', () => {
  it('带 USB 信息的端口', () => {
    const port = { getInfo: () => ({ usbVendorId: 0x2341, usbProductId: 0x43 }) }
    expect(describePort(port, 0)).toEqual({
      label: '串口 #1（0x2341:0x0043）',
      usbVendorId: '0x2341',
      usbProductId: '0x0043',
    })
  })

  it('无 getInfo 时 label 为裸编号', () => {
    expect(describePort({}, 1)).toEqual({
      label: '串口 #2',
      usbVendorId: '0x0000',
      usbProductId: '0x0000',
    })
  })

  it('port 为空时兜底', () => {
    expect(describePort(null)).toEqual({
      label: '串口 #1',
      usbVendorId: '0x0000',
      usbProductId: '0x0000',
    })
  })
})

describe('serial-test · baudRates', () => {
  it('含 8 个常用波特率且递增', () => {
    expect(baudRates).toEqual([9600, 19200, 38400, 57600, 115200, 230400, 460800, 921600])
    expect(baudRates).toContain(115200)
  })
})

describe('serial-test · requestPort', () => {
  it('透传 options 并返回端口', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const port = { getInfo: () => ({}) }
    const serial = {
      requestPort: vi.fn(async (o?: Record<string, unknown>) => {
        seen.push(o)
        return port
      }),
    }
    const got = await requestPort(serial, { filters: [] })
    expect(seen[0]).toEqual({ filters: [] })
    expect(got).toBe(port)
  })

  it('无 API 时抛中文错', async () => {
    await expect(requestPort(null)).rejects.toThrow('不支持 Web Serial')
    await expect(requestPort(undefined)).rejects.toThrow('不支持 Web Serial')
    await expect(requestPort({})).rejects.toThrow('不支持 Web Serial')
  })
})

describe('serial-test · listPorts', () => {
  it('返回已授权端口列表', async () => {
    const ports = [{ getInfo: () => ({}) }, { getInfo: () => ({}) }]
    const serial = { getPorts: vi.fn(async () => ports) }
    expect(await listPorts(serial)).toBe(ports)
  })

  it('未授权时返回空数组', async () => {
    const serial = { getPorts: vi.fn(async () => []) }
    expect(await listPorts(serial)).toEqual([])
  })

  it('无 getPorts 时抛中文错', async () => {
    await expect(listPorts(null)).rejects.toThrow('getPorts 不可用')
    await expect(listPorts({})).rejects.toThrow('getPorts 不可用')
  })
})

describe('serial-test · openPort / closePort', () => {
  it('open 透传 baudRate', async () => {
    const seen: Array<{ baudRate?: number } | undefined> = []
    const port = {
      open: vi.fn(async (o?: { baudRate?: number }) => {
        seen.push(o)
      }),
    }
    await openPort(port, 115200)
    expect(seen[0]).toEqual({ baudRate: 115200 })
  })

  it('open 默认波特率 9600', async () => {
    const seen: Array<{ baudRate?: number } | undefined> = []
    const port = {
      open: vi.fn(async (o?: { baudRate?: number }) => {
        seen.push(o)
      }),
    }
    await openPort(port)
    expect(seen[0]).toEqual({ baudRate: 9600 })
  })

  it('open 缺失时抛中文错', async () => {
    await expect(openPort(null)).rejects.toThrow('open 不可用')
    await expect(openPort({})).rejects.toThrow('open 不可用')
  })

  it('close 正常关闭', async () => {
    const port = { close: vi.fn(async () => {}) }
    await closePort(port)
    expect(port.close).toHaveBeenCalledTimes(1)
  })

  it('close 缺失时抛中文错', async () => {
    await expect(closePort(null)).rejects.toThrow('close 不可用')
    await expect(closePort({})).rejects.toThrow('close 不可用')
  })
})
