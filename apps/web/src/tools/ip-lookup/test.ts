import { describe, expect, it } from 'vitest'
import { parseIPv4, parseIPv6, transform } from './utils'

describe('ip-lookup / IPv4', () => {
  it('192.168.1.1 是私网', () => {
    const out = transform({ text: '192.168.1.1' }, {})
    expect(out).toContain('私网地址（192.168/16）')
    expect(out).toContain('整数表示：3232235777')
  })

  it('127.0.0.1 是环回', () => {
    expect(transform({ text: '127.0.0.1' }, {})).toContain('环回地址')
  })

  it('8.8.8.8 是公网', () => {
    expect(transform({ text: '8.8.8.8' }, {})).toContain('公网地址')
  })

  it('224.0.0.1 是组播', () => {
    expect(transform({ text: '224.0.0.1' }, {})).toContain('组播')
  })

  it('二进制展示 4 段 8 位', () => {
    expect(transform({ text: '10.0.0.1' }, {})).toContain('00001010.00000000.00000000.00000001')
  })

  it('非法 IPv4 抛错', () => {
    expect(() => parseIPv4('1.2.3.256')).toThrow(/0-255/)
    expect(() => parseIPv4('1.2.3')).toThrow(/4 段/)
  })
})

describe('ip-lookup / IPv6', () => {
  it('::1 是环回', () => {
    expect(transform({ text: '::1' }, {})).toContain('环回地址')
  })

  it('2001:db8::1 是公网', () => {
    const out = transform({ text: '2001:db8::1' }, {})
    expect(out).toContain('公网地址')
    expect(out).toContain('2001:db8:0:0:0:0:0:1')
  })

  it('fe80::1 是链路本地', () => {
    expect(transform({ text: 'fe80::1' }, {})).toContain('链路本地')
  })

  it('ff02::1 是组播', () => {
    expect(transform({ text: 'ff02::1' }, {})).toContain('组播')
  })

  it('压缩 :: 正确展开', () => {
    const g = parseIPv6('2001:db8::1')
    expect(g.length).toBe(8)
    expect(g[7]).toBe(1n)
  })

  it('多组 :: 抛错', () => {
    expect(() => parseIPv6('1::2::3')).toThrow(/只能有一个/)
  })
})

describe('ip-lookup / 边界', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('超上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
