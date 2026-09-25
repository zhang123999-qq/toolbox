import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  DIGITS,
  PERIODS,
  generateTotp,
  parseSecret,
  remainingSeconds,
  transform,
} from './utils'

const base = { digits: '6', period: '30', algorithm: 'SHA1' } as const
const eight = { ...base, digits: '8' } as const

/** RFC 6238 测试向量用的密钥（ASCII "12345678901234567890" 的 Latin-1 字节） */
const RFC_SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'

describe('totp-generate / 密钥解析', () => {
  it('Base32 密钥大小写与空格都能吃', () => {
    expect(parseSecret('jbswy3dpehpk3pxp').base32).toBe('JBSWY3DPEHPK3PXP')
    expect(parseSecret('JBSW Y3DP EHPK 3PXP').base32).toBe('JBSWY3DPEHPK3PXP')
  })

  it('非法 Base32 报错（含数字 0/1/8/9 都不合法）', () => {
    expect(() => parseSecret('')).toThrow(/请先填入/)
    expect(() => parseSecret('abc0189')).toThrow(/不是合法的 Base32/)
  })

  it('选项白名单与 schema 一致', () => {
    expect(DIGITS).toEqual(['6', '8'])
    expect(PERIODS).toEqual(['30', '60'])
    expect(ALGORITHMS).toEqual(['SHA1', 'SHA256', 'SHA512'])
  })
})

describe('totp-generate / RFC 6238 向量', () => {
  it('T=59s → 94287082（8 位 / SHA1 / 30 秒）', () => {
    expect(generateTotp(RFC_SECRET, eight, 59_000)).toBe('94287082')
  })

  it('T=1111111109s → 07081804', () => {
    expect(generateTotp(RFC_SECRET, eight, 1_111_111_109_000)).toBe('07081804')
  })

  it('T=2000000000s → 69279037', () => {
    expect(generateTotp(RFC_SECRET, eight, 2_000_000_000_000)).toBe('69279037')
  })

  it('8 位向量的前 6 位就是 6 位模式下的结果', () => {
    expect(generateTotp(RFC_SECRET, base, 59_000)).toBe('287082')
  })
})

describe('totp-generate / 参数生效', () => {
  it('不同摘要得到不同结果', () => {
    const sha1 = generateTotp(RFC_SECRET, eight, 59_000)
    const sha256 = generateTotp(RFC_SECRET, { ...eight, algorithm: 'SHA256' }, 59_000)
    const sha512 = generateTotp(RFC_SECRET, { ...eight, algorithm: 'SHA512' }, 59_000)
    expect(new Set([sha1, sha256, sha512]).size).toBe(3)
  })

  it('周期不同则同一时刻结果不同', () => {
    const p30 = generateTotp(RFC_SECRET, eight, 59_000)
    const p60 = generateTotp(RFC_SECRET, { ...eight, period: '60' }, 59_000)
    expect(p30).not.toBe(p60)
  })

  it('周期内剩余秒数可计算', () => {
    expect(remainingSeconds('30', 59_000)).toBe(30 - 59 % 30)
    expect(remainingSeconds('60', 59_000)).toBe(1)
  })
})

describe('totp-generate / transform', () => {
  it('输出验证码与参数说明', () => {
    const output = transform({ text: RFC_SECRET }, base)
    expect(output).toMatch(/^\d{6}\n/)
    expect(output).toContain('6 位｜周期 30 秒｜SHA1')
  })

  it('空输入返回空串（不生成验证码）', () => {
    expect(transform({ text: '' }, base)).toBe('')
    expect(transform({ text: '   ' }, eight)).toBe('')
  })
})
