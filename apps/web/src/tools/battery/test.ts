/**
 * battery（#861）utils 单测：电池读取、状态描述、电量等级。
 */
import { describe, expect, it } from 'vitest'
import { batteryLevel, batteryStatus, getBattery } from './utils'

describe('getBattery', () => {
  it('注入 mock 时返回电池信息', async () => {
    const r = await getBattery({
      getBattery: () =>
        Promise.resolve({
          level: 0.8,
          charging: true,
          chargingTime: 1800,
          dischargingTime: Infinity,
        }),
    })
    expect(r).toEqual({ level: 0.8, charging: true, chargingTime: 1800, dischargingTime: Infinity })
  })
  it('无 getBattery 时抛中文错误', async () => {
    await expect(getBattery({})).rejects.toThrow('当前浏览器不支持 Battery Status API')
  })
  it('nav 为 null 时抛中文错误', async () => {
    await expect(getBattery(null)).rejects.toThrow('当前浏览器不支持 Battery Status API')
  })
  it('nav 缺省时抛中文错误', async () => {
    await expect(getBattery(undefined)).rejects.toThrow('当前浏览器不支持 Battery Status API')
  })
})

describe('batteryStatus', () => {
  it('充电中显示预计充满时间', () => {
    expect(
      batteryStatus({ level: 0.8, charging: true, chargingTime: 1800, dischargingTime: Infinity }),
    ).toBe('电量 80%（充电中，预计 30 分钟充满）')
  })
  it('充电时间未知时显示未知', () => {
    expect(
      batteryStatus({
        level: 0.5,
        charging: true,
        chargingTime: Infinity,
        dischargingTime: Infinity,
      }),
    ).toContain('未知')
  })
  it('使用电池显示预计可用时间', () => {
    expect(
      batteryStatus({ level: 0.4, charging: false, chargingTime: Infinity, dischargingTime: 7200 }),
    ).toBe('电量 40%（使用电池，预计可用 120 分钟）')
  })
  it('放电时间未知时显示未知', () => {
    expect(
      batteryStatus({
        level: 0.4,
        charging: false,
        chargingTime: Infinity,
        dischargingTime: Infinity,
      }),
    ).toContain('未知')
  })
  it('电量钳制在 0-100 之间', () => {
    expect(
      batteryStatus({ level: 1.5, charging: false, chargingTime: 0, dischargingTime: 60 }),
    ).toContain('100%')
    expect(
      batteryStatus({ level: -0.2, charging: false, chargingTime: 0, dischargingTime: 60 }),
    ).toContain('0%')
  })
})

describe('batteryLevel', () => {
  it('100 → full', () => {
    expect(batteryLevel(100)).toBe('full')
  })
  it('80 → high', () => {
    expect(batteryLevel(80)).toBe('high')
  })
  it('50 → high（边界）', () => {
    expect(batteryLevel(50)).toBe('high')
  })
  it('30 → medium', () => {
    expect(batteryLevel(30)).toBe('medium')
  })
  it('20 → medium（边界）', () => {
    expect(batteryLevel(20)).toBe('medium')
  })
  it('10 → low', () => {
    expect(batteryLevel(10)).toBe('low')
  })
})
