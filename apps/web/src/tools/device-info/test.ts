/**
 * device-info（#860）utils 单测：设备类型判断、设备信息读取与字段兜底。
 */
import { describe, expect, it } from 'vitest'
import { DEVICE_TYPE_TEXT, deviceType, getDeviceInfo } from './utils'

const DESKTOP_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'
const IPAD_UA =
  'Mozilla/5.0 (iPad; CPU OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1'

describe('deviceType', () => {
  it('桌面 UA → desktop', () => {
    expect(deviceType(DESKTOP_UA)).toBe('desktop')
  })
  it('iPhone UA → mobile', () => {
    expect(deviceType(IPHONE_UA)).toBe('mobile')
  })
  it('iPad UA → tablet（平板规则优先）', () => {
    expect(deviceType(IPAD_UA)).toBe('tablet')
  })
  it('空 UA → desktop', () => {
    expect(deviceType('')).toBe('desktop')
  })
})

describe('DEVICE_TYPE_TEXT', () => {
  it('三类中文名齐全', () => {
    expect(DEVICE_TYPE_TEXT).toEqual({ mobile: '手机', tablet: '平板', desktop: '桌面' })
  })
})

describe('getDeviceInfo', () => {
  it('完整 navigator 正确映射', () => {
    const r = getDeviceInfo({
      platform: 'Win32',
      hardwareConcurrency: 8,
      deviceMemory: 16,
      userAgent: DESKTOP_UA,
      language: 'zh-CN',
      maxTouchPoints: 0,
      userAgentData: { mobile: false },
    })
    expect(r).toEqual({
      platform: 'Win32',
      cores: 8,
      memoryGB: 16,
      mobileHint: false,
      language: 'zh-CN',
      touch: false,
      type: 'desktop',
      typeText: '桌面',
    })
  })
  it('字段缺失时兜底不抛错', () => {
    const r = getDeviceInfo({})
    expect(r.platform).toBe('unknown')
    expect(r.cores).toBe(0)
    expect(r.memoryGB).toBeNull()
    expect(r.language).toBe('unknown')
    expect(r.touch).toBe(false)
    expect(r.type).toBe('desktop')
  })
  it('无 userAgentData 时用 UA 正则判断 mobileHint', () => {
    expect(getDeviceInfo({ userAgent: IPHONE_UA }).mobileHint).toBe(true)
    expect(getDeviceInfo({ userAgent: DESKTOP_UA }).mobileHint).toBe(false)
  })
  it('userAgentData.mobile=true 时直接采用', () => {
    expect(getDeviceInfo({ userAgent: DESKTOP_UA, userAgentData: { mobile: true } }).mobileHint).toBe(
      true,
    )
  })
  it('maxTouchPoints>0 → touch 为 true', () => {
    expect(getDeviceInfo({ maxTouchPoints: 5 }).touch).toBe(true)
  })
  it('nav 为 null 时抛中文错误', () => {
    expect(() => getDeviceInfo(null)).toThrow('当前环境无法获取设备信息')
  })
  it('nav 缺省时抛中文错误', () => {
    expect(() => getDeviceInfo()).toThrow('当前环境无法获取设备信息')
  })
})
