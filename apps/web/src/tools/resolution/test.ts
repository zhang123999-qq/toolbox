/**
 * resolution（#858）utils 单测：屏幕信息读取、宽高比换算、常见分辨率表。
 */
import { describe, expect, it } from 'vitest'
import {
  COMMON_RESOLUTIONS,
  aspectRatio,
  commonResolutionById,
  getScreenInfo,
} from './utils'

const fakeScreen = { width: 1920, height: 1080, colorDepth: 24 }
const fakeWindow = { innerWidth: 1280, innerHeight: 720, devicePixelRatio: 2 }

describe('getScreenInfo', () => {
  it('注入字面对象时正确映射字段', () => {
    expect(getScreenInfo(fakeScreen, fakeWindow)).toEqual({
      screenW: 1920,
      screenH: 1080,
      viewportW: 1280,
      viewportH: 720,
      dpr: 2,
      colorDepth: 24,
    })
  })
  it('screen 为 null 时抛中文错误', () => {
    expect(() => getScreenInfo(null, fakeWindow)).toThrow('当前环境无法获取屏幕信息')
  })
  it('window 为 undefined 时抛中文错误', () => {
    expect(() => getScreenInfo(fakeScreen, undefined)).toThrow('当前环境无法获取屏幕信息')
  })
  it('两者都缺省时抛中文错误', () => {
    expect(() => getScreenInfo()).toThrow('当前环境无法获取屏幕信息')
  })
})

describe('aspectRatio', () => {
  it('1920×1080 → 16:9', () => {
    expect(aspectRatio(1920, 1080)).toBe('16:9')
  })
  it('1280×1024 → 5:4', () => {
    expect(aspectRatio(1280, 1024)).toBe('5:4')
  })
  it('正方形 → 1:1', () => {
    expect(aspectRatio(500, 500)).toBe('1:1')
  })
  it('竖屏 1080×1920 → 9:16', () => {
    expect(aspectRatio(1080, 1920)).toBe('9:16')
  })
  it('宽度为 0 时抛中文错误', () => {
    expect(() => aspectRatio(0, 1080)).toThrow('宽高必须为正数')
  })
  it('高度为负数时抛中文错误', () => {
    expect(() => aspectRatio(1920, -1)).toThrow('宽高必须为正数')
  })
  it('NaN 时抛中文错误', () => {
    expect(() => aspectRatio(Number.NaN, 1080)).toThrow('宽高必须为正数')
  })
})

describe('COMMON_RESOLUTIONS', () => {
  it('共 6 项且 id 不重复', () => {
    expect(COMMON_RESOLUTIONS).toHaveLength(6)
    expect(new Set(COMMON_RESOLUTIONS.map((r) => r.id)).size).toBe(6)
  })
  it('宽高均为正数', () => {
    for (const r of COMMON_RESOLUTIONS) {
      expect(r.width).toBeGreaterThan(0)
      expect(r.height).toBeGreaterThan(0)
    }
  })
})

describe('commonResolutionById', () => {
  it('uhd 返回 3840×2160', () => {
    expect(commonResolutionById('uhd')).toMatchObject({ width: 3840, height: 2160 })
  })
  it('未知 id 抛中文错误', () => {
    expect(() => commonResolutionById('nope')).toThrow('未知分辨率：nope')
  })
})
