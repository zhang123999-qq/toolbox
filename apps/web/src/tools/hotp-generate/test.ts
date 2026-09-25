import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  DIGITS,
  generateHotp,
  parseCounter,
  parseSecret,
  transform,
} from './utils'

const base = { digits: '6', algorithm: 'SHA1' } as const
const eight = { ...base, digits: '8' } as const

/** RFC 4226 的密钥：ASCII "12345678901234567890" 的 Base32 */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

/** RFC 4226 附录 D：计数器 0–9 在 SHA1 / 6 位下的口令 */
const RFC_CODES = [
  '755224',
  '287082',
  '359152',
  '969429',
  '338314',
  '254676',
  '287922',
  '162583',
  '399871',
  '520489',
]

describe('hotp-generate / RFC 4226 向量', () => {
  it('计数器 0–9 全部与标准一致', () => {
    RFC_CODES.forEach((expected, counter) => {
      expect(generateHotp(RFC_SECRET, String(counter), base)).toBe(expected)
    })
  })

  it('8 位模式下与 6 位同源（前 6 位一致）', () => {
    const code6 = generateHotp(RFC_SECRET, '0', base)
    const code8 = generateHotp(RFC_SECRET, '0', eight)
    expect(code8.length).toBe(8)
    expect(code8.endsWith(code6)).toBe(true)
  })
})

describe('hotp-generate / 输入解析', () => {
  it('密钥容忍空格与小写', () => {
    expect(parseSecret('gezd gnbv gy3t qojq gezd gnbv gy3t qojq').base32).toBe(RFC_SECRET)
    expect(() => parseSecret('')).toThrow(/请先填入/)
    expect(() => parseSecret('0189')).toThrow(/不是合法的 Base32/)
  })

  it('计数器必须是非负整数', () => {
    expect(parseCounter(' 0 ')).toBe(0)
    expect(parseCounter('42')).toBe(42)
    expect(() => parseCounter('')).toThrow(/请先填入计数器/)
    expect(() => parseCounter('-1')).toThrow(/非负整数/)
    expect(() => parseCounter('1e3')).toThrow(/非负整数/)
  })

  it('选项白名单与 schema 一致', () => {
    expect(DIGITS).toEqual(['6', '8'])
    expect(ALGORITHMS).toEqual(['SHA1', 'SHA256', 'SHA512'])
  })
})

describe('hotp-generate / 参数生效', () => {
  it('同一密钥下不同摘要结果不同', () => {
    const codes = (['SHA1', 'SHA256', 'SHA512'] as const).map((algorithm) =>
      generateHotp(RFC_SECRET, '0', { ...base, algorithm }),
    )
    expect(new Set(codes).size).toBe(3)
  })

  it('计数器 +1 结果就变（这正是 HOTP 的定义）', () => {
    expect(generateHotp(RFC_SECRET, '1', base)).not.toBe(generateHotp(RFC_SECRET, '2', base))
  })
})

describe('hotp-generate / transform', () => {
  it('输出口令与参数说明', () => {
    expect(transform({ text: RFC_SECRET, counter: '0' }, base)).toBe(
      '755224\n\n6 位｜计数器 0｜SHA1',
    )
  })

  it('空输入返回空串（不生成口令）', () => {
    expect(transform({ text: '', counter: '0' }, base)).toBe('')
    expect(transform({ text: '   ', counter: '' }, eight)).toBe('')
  })
})
