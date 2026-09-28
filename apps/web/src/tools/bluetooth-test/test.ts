/**
 * bluetooth-test 工具测试（#868）：navigator.bluetooth 经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  deviceIdShort,
  listPairedDevices,
  parseDeviceName,
  requestDevice,
  supportsBluetooth,
  toDeviceInfo,
} from './utils'

describe('bluetooth-test · supportsBluetooth', () => {
  it('navigator 为空或无 bluetooth 时返回 false', () => {
    expect(supportsBluetooth(null)).toBe(false)
    expect(supportsBluetooth(undefined)).toBe(false)
    expect(supportsBluetooth({})).toBe(false)
  })

  it('有 bluetooth 时返回 true', () => {
    expect(supportsBluetooth({ bluetooth: {} })).toBe(true)
  })
})

describe('bluetooth-test · parseDeviceName', () => {
  it('正常设备名', () => {
    expect(parseDeviceName({ name: 'AirPods' })).toBe('AirPods')
  })

  it('null/空字符串/空白 → 未知设备', () => {
    expect(parseDeviceName({ name: null })).toBe('未知设备')
    expect(parseDeviceName({ name: '' })).toBe('未知设备')
    expect(parseDeviceName({ name: '   ' })).toBe('未知设备')
  })

  it('device 为空时 → 未知设备', () => {
    expect(parseDeviceName(null)).toBe('未知设备')
    expect(parseDeviceName(undefined)).toBe('未知设备')
  })

  it('自动去除首尾空白', () => {
    expect(parseDeviceName({ name: '  手环  ' })).toBe('手环')
  })
})

describe('bluetooth-test · deviceIdShort', () => {
  it('长 ID 取前 8 位 + 省略号', () => {
    expect(deviceIdShort({ id: 'abcdefgh123456' })).toBe('abcdefgh…')
  })

  it('短 ID（≤12 位）保持原样', () => {
    expect(deviceIdShort({ id: 'abcd1234' })).toBe('abcd1234')
    expect(deviceIdShort({ id: '123456789012' })).toBe('123456789012')
  })

  it('13 位 ID 也简写', () => {
    expect(deviceIdShort({ id: '1234567890123' })).toBe('12345678…')
  })

  it('空 ID → 无 ID', () => {
    expect(deviceIdShort({})).toBe('无 ID')
    expect(deviceIdShort(null)).toBe('无 ID')
  })
})

describe('bluetooth-test · toDeviceInfo', () => {
  it('组合 id/name/shortId', () => {
    expect(toDeviceInfo({ id: 'abcdefgh123456', name: '手环' })).toEqual({
      id: 'abcdefgh123456',
      name: '手环',
      shortId: 'abcdefgh…',
    })
  })

  it('缺字段时兜底', () => {
    expect(toDeviceInfo(null)).toEqual({ id: '', name: '未知设备', shortId: '无 ID' })
  })
})

describe('bluetooth-test · requestDevice', () => {
  it('透传 options 并返回设备信息', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const bt = {
      requestDevice: vi.fn(async (o?: Record<string, unknown>) => {
        seen.push(o)
        return { id: 'dev001', name: '键盘' }
      }),
    }
    const info = await requestDevice(bt, { acceptAllDevices: true })
    expect(seen[0]).toEqual({ acceptAllDevices: true })
    expect(info).toEqual({ id: 'dev001', name: '键盘', shortId: 'dev001' })
  })

  it('默认 options 为 acceptAllDevices', async () => {
    const seen: Array<Record<string, unknown> | undefined> = []
    const bt = { requestDevice: vi.fn(async (o?: Record<string, unknown>) => {
      seen.push(o)
      return { id: 'x', name: null }
    }) }
    const info = await requestDevice(bt)
    expect(seen[0]).toEqual({ acceptAllDevices: true })
    expect(info.name).toBe('未知设备')
  })

  it('无 API 时抛中文错', async () => {
    await expect(requestDevice(null)).rejects.toThrow('不支持 Web Bluetooth')
    await expect(requestDevice(undefined)).rejects.toThrow('不支持 Web Bluetooth')
    await expect(requestDevice({})).rejects.toThrow('不支持 Web Bluetooth')
  })
})

describe('bluetooth-test · listPairedDevices', () => {
  it('返回已配对设备列表', async () => {
    const bt = {
      getDevices: vi.fn(async () => [
        { id: 'a1', name: '手表' },
        { id: 'b2', name: null },
      ]),
    }
    const list = await listPairedDevices(bt)
    expect(list).toHaveLength(2)
    expect(list[0]?.name).toBe('手表')
    expect(list[1]?.name).toBe('未知设备')
  })

  it('未授权时返回空数组', async () => {
    const bt = { getDevices: vi.fn(async () => []) }
    expect(await listPairedDevices(bt)).toEqual([])
  })

  it('无 getDevices 时抛中文错', async () => {
    await expect(listPairedDevices(null)).rejects.toThrow('getDevices 不可用')
    await expect(listPairedDevices({})).rejects.toThrow('getDevices 不可用')
  })
})
