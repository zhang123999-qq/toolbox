/**
 * mic-test（#835）utils 单测：电平计算、状态文案、getUserMedia 封装。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  MIC_STATUS_TEXT,
  computeLevel,
  describeLevel,
  formatLevel,
  getMicStream,
} from './utils'

describe('computeLevel', () => {
  it('全 128（静音基准）为 0', () => {
    expect(computeLevel(new Uint8Array([128, 128, 128, 128]))).toBe(0)
  })
  it('空数组为 0', () => {
    expect(computeLevel(new Uint8Array([]))).toBe(0)
  })
  it('满偏离钳制在 100', () => {
    expect(computeLevel(new Uint8Array([255, 255, 255, 255]))).toBe(100)
    expect(computeLevel(new Uint8Array([0, 0, 0, 0]))).toBe(100)
  })
  it('中等偏离按比例计算', () => {
    // 均值 160：偏离 32/128=0.25 → 0.25*200=50
    expect(computeLevel(new Uint8Array([160, 160, 160, 160]))).toBe(50)
  })
  it('单样本也计算', () => {
    expect(computeLevel(new Uint8Array([128]))).toBe(0)
    expect(computeLevel(new Uint8Array([192]))).toBe(100)
  })
})

describe('describeLevel', () => {
  it('0 静音', () => {
    expect(describeLevel(0)).toBe('静音')
  })
  it('负数也算静音', () => {
    expect(describeLevel(-5)).toBe('静音')
  })
  it('1～19 很弱', () => {
    expect(describeLevel(1)).toBe('很弱')
    expect(describeLevel(19)).toBe('很弱')
  })
  it('20～49 正常', () => {
    expect(describeLevel(20)).toBe('正常')
    expect(describeLevel(49)).toBe('正常')
  })
  it('50～79 较强', () => {
    expect(describeLevel(50)).toBe('较强')
    expect(describeLevel(79)).toBe('较强')
  })
  it('80 及以上过载', () => {
    expect(describeLevel(80)).toBe('过载')
    expect(describeLevel(100)).toBe('过载')
  })
})

describe('formatLevel', () => {
  it('整数直接加百分号', () => {
    expect(formatLevel(42)).toBe('42%')
  })
  it('小数四舍五入', () => {
    expect(formatLevel(42.6)).toBe('43%')
  })
})

describe('MIC_STATUS_TEXT', () => {
  it('5 个状态都有中文文案', () => {
    for (const s of ['idle', 'requesting', 'active', 'denied', 'unsupported'] as const) {
      expect(MIC_STATUS_TEXT[s].length).toBeGreaterThan(0)
    }
  })
})

describe('getMicStream', () => {
  it('缺失 mediaDevices 抛中文错误', async () => {
    await expect(getMicStream(undefined)).rejects.toThrow('不支持')
    await expect(getMicStream(null)).rejects.toThrow('不支持')
  })
  it('无 getUserMedia 函数抛中文错误', async () => {
    await expect(getMicStream({} as never)).rejects.toThrow('不支持')
  })
  it('调用 getUserMedia 并返回流', async () => {
    const fakeStream = { id: 'mic' }
    const getUserMedia = vi.fn().mockResolvedValue(fakeStream)
    const stream = await getMicStream({ getUserMedia } as never)
    expect(stream).toBe(fakeStream)
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
  })
})
