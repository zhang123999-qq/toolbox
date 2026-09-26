import { describe, expect, it } from 'vitest'
import { computeCidr, formatIPv4, parseIPv4, transform } from './utils'

describe('cidr / parseIPv4 & formatIPv4', () => {
  it('往返一致', () => {
    expect(formatIPv4(parseIPv4('192.168.1.1'))).toBe('192.168.1.1')
  })

  it('段越界抛错', () => {
    expect(() => parseIPv4('192.168.1.256')).toThrow(/0-255/)
  })
})

describe('cidr / computeCidr', () => {
  it('192.168.1.0/24', () => {
    const r = computeCidr('192.168.1.0/24')
    expect(formatIPv4(r.mask)).toBe('255.255.255.0')
    expect(formatIPv4(r.network)).toBe('192.168.1.0')
    expect(formatIPv4(r.broadcast)).toBe('192.168.1.255')
    expect(formatIPv4(r.first)).toBe('192.168.1.1')
    expect(formatIPv4(r.last)).toBe('192.168.1.254')
    expect(r.total).toBe(256)
  })

  it('10.0.0.0/8', () => {
    const r = computeCidr('10.0.0.0/8')
    expect(formatIPv4(r.mask)).toBe('255.0.0.0')
    expect(formatIPv4(r.broadcast)).toBe('10.255.255.255')
    expect(r.total).toBe(16777216)
  })

  it('带主机位输入也归一到网络地址', () => {
    const r = computeCidr('192.168.1.55/24')
    expect(formatIPv4(r.network)).toBe('192.168.1.0')
  })

  it('/32 单机', () => {
    const r = computeCidr('8.8.8.8/32')
    expect(r.total).toBe(1)
    expect(formatIPv4(r.network)).toBe('8.8.8.8')
  })

  it('/31 点对点（RFC3021：两个地址均可用）', () => {
    const r = computeCidr('192.168.1.0/31')
    expect(formatIPv4(r.mask)).toBe('255.255.255.254')
    expect(formatIPv4(r.network)).toBe('192.168.1.0')
    expect(formatIPv4(r.broadcast)).toBe('192.168.1.1')
    expect(r.total).toBe(2)
    expect(formatIPv4(r.first)).toBe('192.168.1.0')
    expect(formatIPv4(r.last)).toBe('192.168.1.1')
  })

  it('/0 整段地址空间（掩码须为 0.0.0.0，规避 JS 移位 mod32 陷阱）', () => {
    const r = computeCidr('0.0.0.0/0')
    expect(formatIPv4(r.mask)).toBe('0.0.0.0')
    expect(formatIPv4(r.network)).toBe('0.0.0.0')
    expect(formatIPv4(r.broadcast)).toBe('255.255.255.255')
    expect(r.total).toBe(4294967296)
  })

  it('非法格式抛错', () => {
    expect(() => computeCidr('999.1.1.1/24')).toThrow(/0-255/)
    expect(() => computeCidr('1.2.3.4/40')).toThrow(/0-32/)
    expect(() => computeCidr('abc')).toThrow(/格式/)
  })
})

describe('cidr / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('输出含掩码与可用范围', () => {
    const out = transform({ text: '192.168.1.0/24' }, {})
    expect(out).toContain('子网掩码：255.255.255.0')
    expect(out).toContain('可用主机范围：192.168.1.1 ~ 192.168.1.254')
    expect(out).toContain('可用主机数：254')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
