/**
 * network-info（#862）utils 单测：网络信息读取、类型中文名、状况描述。
 */
import { describe, expect, it } from 'vitest'
import { describeConnection, effectiveTypeText, getNetworkInfo } from './utils'

describe('getNetworkInfo', () => {
  it('完整 connection 正确映射', () => {
    const r = getNetworkInfo({
      onLine: true,
      connection: { effectiveType: '4g', downlink: 10, rtt: 50, saveData: false },
    })
    expect(r).toEqual({ online: true, effectiveType: '4g', downlink: 10, rtt: 50, saveData: false })
  })
  it('无 connection 时兜底不抛错', () => {
    const r = getNetworkInfo({ onLine: false })
    expect(r).toEqual({
      online: false,
      effectiveType: 'unknown',
      downlink: null,
      rtt: null,
      saveData: false,
    })
  })
  it('connection 为 null 时兜底', () => {
    const r = getNetworkInfo({ connection: null })
    expect(r.effectiveType).toBe('unknown')
    expect(r.downlink).toBeNull()
  })
  it('字段部分缺失时各自兜底', () => {
    const r = getNetworkInfo({ connection: { effectiveType: '3g' } })
    expect(r.effectiveType).toBe('3g')
    expect(r.downlink).toBeNull()
    expect(r.rtt).toBeNull()
    expect(r.saveData).toBe(false)
  })
  it('nav 为 null 时抛中文错误', () => {
    expect(() => getNetworkInfo(null)).toThrow('当前环境无法获取网络信息')
  })
  it('nav 缺省时抛中文错误', () => {
    expect(() => getNetworkInfo()).toThrow('当前环境无法获取网络信息')
  })
})

describe('effectiveTypeText', () => {
  it('4g → 4G', () => {
    expect(effectiveTypeText('4g')).toBe('4G')
  })
  it('slow-2g → 慢速 2G', () => {
    expect(effectiveTypeText('slow-2g')).toBe('慢速 2G')
  })
  it('unknown → 未知', () => {
    expect(effectiveTypeText('unknown')).toBe('未知')
  })
  it('未收录类型原样返回', () => {
    expect(effectiveTypeText('5g')).toBe('5g')
  })
})

describe('describeConnection', () => {
  it('完整信息拼接', () => {
    expect(
      describeConnection({ online: true, effectiveType: '4g', downlink: 10, rtt: 50, saveData: false }),
    ).toBe('网络在线，网络类型 4G，下行约 10 Mbps，RTT 50 ms')
  })
  it('离线 + 省流模式', () => {
    expect(
      describeConnection({ online: false, effectiveType: 'unknown', downlink: null, rtt: null, saveData: true }),
    ).toBe('网络离线，已开启省流模式')
  })
  it('仅在线（无 API 数据）', () => {
    expect(
      describeConnection({ online: true, effectiveType: 'unknown', downlink: null, rtt: null, saveData: false }),
    ).toBe('网络在线')
  })
  it('只有 rtt 时也拼接', () => {
    expect(
      describeConnection({ online: true, effectiveType: 'unknown', downlink: null, rtt: 120, saveData: false }),
    ).toBe('网络在线，RTT 120 ms')
  })
})
