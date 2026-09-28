import { describe, expect, it } from 'vitest'
import {
  MAX_PEAK_WIDTH,
  MAX_ZOOM_FACTOR,
  computePeaks,
  formatTimeSec,
  formatViewRange,
  mixToMono,
  samplesToSeconds,
  zoomView,
} from './utils'

describe('waveform / 峰值抽取', () => {
  it('基本抽取：每列的最小/最大值', () => {
    const peaks = computePeaks(new Float32Array([1, -1, 0.5, -0.5]), 2)
    expect(peaks.length).toBe(2)
    expect(peaks[0]).toEqual({ min: -1, max: 1 })
    expect(peaks[1]).toEqual({ min: -0.5, max: 0.5 })
  })

  it('列数多于采样点：每列至少覆盖 1 个采样', () => {
    const peaks = computePeaks(new Float32Array([0.5, -0.5]), 4)
    expect(peaks.length).toBe(4)
    expect(peaks[0]).toEqual({ min: 0.5, max: 0.5 })
    expect(peaks[2]).toEqual({ min: -0.5, max: -0.5 })
  })

  it('空采样返回全 0 列', () => {
    const peaks = computePeaks(new Float32Array(0), 3)
    expect(peaks).toEqual([
      { min: 0, max: 0 },
      { min: 0, max: 0 },
      { min: 0, max: 0 },
    ])
  })

  it('非单调序列：正确取最小/最大值', () => {
    const peaks = computePeaks(new Float32Array([1, 2, -1, 0.5]), 1)
    expect(peaks[0]).toEqual({ min: -1, max: 2 })
  })

  it('不修改输入', () => {
    const src = new Float32Array([0.2, -0.3])
    computePeaks(src, 2)
    expect(src[0]).toBeCloseTo(0.2, 6)
    expect(src[1]).toBeCloseTo(-0.3, 6)
  })

  it('列数非法抛中文错', () => {
    for (const bad of [0, -1, 1.5, Number.NaN, MAX_PEAK_WIDTH + 1]) {
      expect(() => computePeaks(new Float32Array([1]), bad)).toThrow(/列数非法/)
    }
  })
})

describe('waveform / 缩放视图', () => {
  it('倍数为 1 时显示全部', () => {
    expect(zoomView(1000, 500, 1)).toEqual({ start: 0, end: 1000 })
  })

  it('倍数为 2 时以中心点为中点显示一半', () => {
    expect(zoomView(1000, 500, 2)).toEqual({ start: 250, end: 750 })
  })

  it('靠近左边缘时视图贴左', () => {
    expect(zoomView(1000, 50, 4)).toEqual({ start: 0, end: 250 })
  })

  it('靠近右边缘时视图贴右', () => {
    expect(zoomView(1000, 990, 4)).toEqual({ start: 750, end: 1000 })
  })

  it('中心点越界被钳制', () => {
    expect(zoomView(1000, -100, 2)).toEqual({ start: 0, end: 500 })
    expect(zoomView(1000, 99999, 2)).toEqual({ start: 500, end: 1000 })
  })

  it('极大倍数下视图至少 2 个采样点', () => {
    const view = zoomView(100, 50, MAX_ZOOM_FACTOR)
    expect(view.end - view.start).toBeGreaterThanOrEqual(2)
    expect(view.start).toBeGreaterThanOrEqual(0)
    expect(view.end).toBeLessThanOrEqual(100)
  })

  it('参数非法抛中文错', () => {
    expect(() => zoomView(0, 0, 1)).toThrow(/采样点数非法/)
    expect(() => zoomView(1.5, 0, 1)).toThrow(/采样点数非法/)
    expect(() => zoomView(1000, Number.NaN, 1)).toThrow(/中心点非法/)
    expect(() => zoomView(1000, Number.POSITIVE_INFINITY, 1)).toThrow(/中心点非法/)
    expect(() => zoomView(1000, 500, 0.5)).toThrow(/缩放倍数非法/)
    expect(() => zoomView(1000, 500, 0)).toThrow(/缩放倍数非法/)
    expect(() => zoomView(1000, 500, MAX_ZOOM_FACTOR + 1)).toThrow(/缩放倍数非法/)
    expect(() => zoomView(1000, 500, Number.NaN)).toThrow(/缩放倍数非法/)
  })
})

describe('waveform / 声道混合', () => {
  it('立体声平均成单声道', () => {
    const mono = mixToMono([new Float32Array([1, 0.5]), new Float32Array([-1, 0.5])])
    expect([...mono]).toEqual([0, 0.5])
  })

  it('单声道原样返回（拷贝）', () => {
    const src = new Float32Array([0.3, -0.3])
    const mono = mixToMono([src])
    expect(mono[0]).toBeCloseTo(0.3, 6)
    expect(mono[1]).toBeCloseTo(-0.3, 6)
    expect(mono).not.toBe(src)
  })

  it('空声道 / 长度不一致抛中文错', () => {
    expect(() => mixToMono([])).toThrow(/声道数据为空/)
    expect(() => mixToMono([new Float32Array(4), new Float32Array(3)])).toThrow(/声道长度不一致/)
  })
})

describe('waveform / 时间换算与格式化', () => {
  it('采样点数转秒', () => {
    expect(samplesToSeconds(44100, 44100)).toBe(1)
    expect(samplesToSeconds(0, 48000)).toBe(0)
  })

  it('采样点数/采样率非法抛中文错', () => {
    expect(() => samplesToSeconds(-1, 44100)).toThrow(/采样点数非法/)
    expect(() => samplesToSeconds(Number.NaN, 44100)).toThrow(/采样点数非法/)
    expect(() => samplesToSeconds(100, 0)).toThrow(/采样率非法/)
    expect(() => samplesToSeconds(100, -44100)).toThrow(/采样率非法/)
  })

  it('秒格式化为 MM:SS.mmm', () => {
    expect(formatTimeSec(0)).toBe('00:00.000')
    expect(formatTimeSec(5.2)).toBe('00:05.200')
    expect(formatTimeSec(65.234)).toBe('01:05.234')
    expect(formatTimeSec(600)).toBe('10:00.000')
  })

  it('负数/NaN 时间抛中文错', () => {
    expect(() => formatTimeSec(-1)).toThrow(/时间非法/)
    expect(() => formatTimeSec(Number.NaN)).toThrow(/时间非法/)
  })

  it('视图时间范围中文描述', () => {
    expect(formatViewRange({ start: 0, end: 44100 }, 44100)).toBe('00:00.000 – 00:01.000')
  })
})
