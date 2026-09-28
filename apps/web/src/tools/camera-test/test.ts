/**
 * camera-test（#836）utils 单测：分辨率预设、约束构造、设备枚举、视频流申请。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  CAMERA_STATUS_TEXT,
  RESOLUTION_PRESETS,
  buildVideoConstraints,
  getCameraStream,
  listCameras,
  presetById,
} from './utils'

describe('RESOLUTION_PRESETS', () => {
  it('共 4 档且 id 不重复', () => {
    expect(RESOLUTION_PRESETS).toHaveLength(4)
    expect(new Set(RESOLUTION_PRESETS.map((p) => p.id)).size).toBe(4)
  })
  it('宽高均为正数', () => {
    for (const p of RESOLUTION_PRESETS) {
      expect(p.width).toBeGreaterThan(0)
      expect(p.height).toBeGreaterThan(0)
    }
  })
})

describe('presetById', () => {
  it('hd 返回 1280×720', () => {
    expect(presetById('hd')).toEqual({
      id: 'hd',
      name: 'HD 720p 1280×720',
      width: 1280,
      height: 720,
    })
  })
  it('未知 id 抛中文错误', () => {
    expect(() => presetById('nope')).toThrow('未知分辨率预设：nope')
  })
})

describe('buildVideoConstraints', () => {
  const vga = { id: 'vga', name: 'VGA', width: 640, height: 480 }
  it('无 deviceId 时只含宽高 ideal', () => {
    expect(buildVideoConstraints(vga)).toEqual({
      width: { ideal: 640 },
      height: { ideal: 480 },
    })
  })
  it('有 deviceId 时加 exact 约束', () => {
    const c = buildVideoConstraints(vga, 'cam-1')
    expect(c.deviceId).toEqual({ exact: 'cam-1' })
  })
  it('空字符串 deviceId 不加约束', () => {
    expect(buildVideoConstraints(vga, '')).not.toHaveProperty('deviceId')
  })
  it('空白字符串 deviceId 不加约束', () => {
    expect(buildVideoConstraints(vga, '   ')).not.toHaveProperty('deviceId')
  })
})

describe('listCameras', () => {
  it('缺失 mediaDevices 抛中文错误', async () => {
    await expect(listCameras(undefined)).rejects.toThrow('不支持')
    await expect(listCameras(null)).rejects.toThrow('不支持')
  })
  it('无 enumerateDevices 抛中文错误', async () => {
    await expect(listCameras({} as never)).rejects.toThrow('不支持')
  })
  it('只返回 videoinput 并补默认标签', async () => {
    const enumerateDevices = vi.fn().mockResolvedValue([
      { kind: 'videoinput', deviceId: 'a', label: '前置' },
      { kind: 'audioinput', deviceId: 'b', label: '麦克风' },
      { kind: 'videoinput', deviceId: 'c', label: '' },
    ])
    const cameras = await listCameras({ enumerateDevices })
    expect(cameras).toEqual([
      { deviceId: 'a', label: '前置' },
      { deviceId: 'c', label: '摄像头' },
    ])
  })
})

describe('getCameraStream', () => {
  it('缺失 mediaDevices 抛中文错误', async () => {
    await expect(getCameraStream(undefined, 'vga')).rejects.toThrow('不支持')
  })
  it('未知分辨率抛中文错误', async () => {
    const getUserMedia = vi.fn()
    await expect(getCameraStream({ getUserMedia } as never, 'nope')).rejects.toThrow(
      '未知分辨率预设',
    )
    expect(getUserMedia).not.toHaveBeenCalled()
  })
  it('按预设构造约束并返回流', async () => {
    const fakeStream = { id: 'cam' }
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
    const stream = await getCameraStream({ getUserMedia } as never, 'hd', 'cam-1')
    expect(stream).toBe(fakeStream)
    expect(getUserMedia).toHaveBeenCalledWith({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        deviceId: { exact: 'cam-1' },
      },
    })
  })
})

describe('CAMERA_STATUS_TEXT', () => {
  it('5 个状态都有中文文案', () => {
    for (const s of ['idle', 'requesting', 'active', 'denied', 'unsupported'] as const) {
      expect(CAMERA_STATUS_TEXT[s].length).toBeGreaterThan(0)
    }
  })
})
