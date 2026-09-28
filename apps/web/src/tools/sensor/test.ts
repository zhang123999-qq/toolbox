/**
 * sensor 工具测试（#867）：事件对象经参数注入字面 mock。
 */
import { describe, expect, it, vi } from 'vitest'
import {
  formatAccel,
  formatTilt,
  motionMagnitude,
  readMotion,
  requestMotionPermission,
  tiltFromOrientation,
} from './utils'

describe('sensor · readMotion', () => {
  it('事件为空时三轴均为 null', () => {
    expect(readMotion(null)).toEqual({ x: null, y: null, z: null })
    expect(readMotion(undefined)).toEqual({ x: null, y: null, z: null })
  })

  it('加速度字段缺失时为 null', () => {
    expect(readMotion({})).toEqual({ x: null, y: null, z: null })
    expect(readMotion({ accelerationIncludingGravity: null })).toEqual({
      x: null,
      y: null,
      z: null,
    })
  })

  it('正常解析三轴', () => {
    expect(readMotion({ accelerationIncludingGravity: { x: 1, y: -2, z: 9.8 } })).toEqual({
      x: 1,
      y: -2,
      z: 9.8,
    })
  })

  it('单轴缺失时仅该轴为 null', () => {
    expect(readMotion({ accelerationIncludingGravity: { x: 1, y: null, z: 3 } })).toEqual({
      x: 1,
      y: null,
      z: 3,
    })
  })
})

describe('sensor · motionMagnitude', () => {
  it('3-4-0 合成 5', () => {
    expect(motionMagnitude({ x: 3, y: 4, z: 0 })).toBe(5)
  })

  it('null 轴按 0 处理', () => {
    expect(motionMagnitude({ x: null, y: null, z: null })).toBe(0)
    expect(motionMagnitude({ x: 3, y: null, z: 4 })).toBe(5)
  })
})

describe('sensor · tiltFromOrientation', () => {
  it('事件为空时倾斜角为 null', () => {
    expect(tiltFromOrientation(null)).toEqual({ pitch: null, roll: null })
    expect(tiltFromOrientation(undefined)).toEqual({ pitch: null, roll: null })
  })

  it('beta 映射前后倾、gamma 映射左右倾', () => {
    expect(tiltFromOrientation({ alpha: 10, beta: 20, gamma: -30 })).toEqual({
      pitch: 20,
      roll: -30,
    })
  })

  it('缺失轴为 null', () => {
    expect(tiltFromOrientation({ alpha: null, beta: null, gamma: null })).toEqual({
      pitch: null,
      roll: null,
    })
  })
})

describe('sensor · formatAccel / formatTilt', () => {
  it('null 显示未知', () => {
    expect(formatAccel({ x: null, y: null, z: null })).toContain('未知')
    expect(formatTilt({ pitch: null, roll: null })).toContain('未知')
  })

  it('数值保留两位小数', () => {
    expect(formatAccel({ x: 1, y: 2, z: 3 })).toBe('X 1.00 m/s²，Y 2.00 m/s²，Z 3.00 m/s²')
    expect(formatTilt({ pitch: 10, roll: -5 })).toBe('前后倾 10.00 °，左右倾 -5.00 °')
  })
})

describe('sensor · requestMotionPermission', () => {
  it('无 requestPermission 时返回 not-required', async () => {
    await expect(requestMotionPermission(null)).resolves.toBe('not-required')
    await expect(requestMotionPermission(undefined)).resolves.toBe('not-required')
    await expect(requestMotionPermission({})).resolves.toBe('not-required')
  })

  it('iOS 构造器时透传申请结果', async () => {
    const ctor = { requestPermission: vi.fn(async () => 'granted') }
    await expect(requestMotionPermission(ctor)).resolves.toBe('granted')
    expect(ctor.requestPermission).toHaveBeenCalled()
  })
})
