import { describe, expect, it } from 'vitest'
import {
  ALGORITHMS,
  DIGITS,
  PERIODS,
  TYPES,
  buildUri,
  parseCounter,
  parseSecret,
  renderQrAscii,
  requireLabel,
  transform,
} from './utils'

const base = { type: 'totp', digits: '6', period: '30', algorithm: 'SHA1' } as const
const hotp = { ...base, type: 'hotp' } as const

const input = {
  text: 'JBSWY3DPEHPK3PXP',
  issuer: 'Toolbox',
  account: 'demo@example.com',
  counter: '0',
}

describe('otp-qr / URI', () => {
  it('TOTP 的 URI 含类型、签发者、密钥与参数', () => {
    const uri = buildUri(input, base)
    expect(uri.startsWith('otpauth://totp/Toolbox:demo%40example.com?')).toBe(true)
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP')
    expect(uri).toContain('issuer=Toolbox')
    expect(uri).toContain('digits=6')
    expect(uri).toContain('period=30')
  })

  it('HOTP 的 URI 带 counter', () => {
    const uri = buildUri(input, hotp)
    expect(uri.startsWith('otpauth://hotp/')).toBe(true)
    expect(uri).toContain('counter=0')
    expect(uri).not.toContain('period=')
  })

  it('只填账户名时也能生成（issuer 缺省）', () => {
    const uri = buildUri({ ...input, issuer: '' }, base)
    expect(uri).toContain('otpauth://totp/demo%40example.com?')
  })

  it('账户名与签发者都空时报错', () => {
    expect(() => requireLabel({ ...input, issuer: '', account: '' })).toThrow(/至少填写/)
  })

  it('密钥与计数器校验', () => {
    expect(parseSecret('jbsw y3dp').base32).toBe('JBSWY3DP')
    expect(() => parseSecret('0189')).toThrow(/不是合法的 Base32/)
    expect(parseCounter('7')).toBe(7)
    expect(() => parseCounter('-1')).toThrow(/非负整数/)
  })

  it('选项白名单与 schema 一致', () => {
    expect(TYPES).toEqual(['totp', 'hotp'])
    expect(DIGITS).toEqual(['6', '8'])
    expect(PERIODS).toEqual(['30', '60'])
    expect(ALGORITHMS).toEqual(['SHA1', 'SHA256', 'SHA512'])
  })
})

describe('otp-qr / 字符画二维码', () => {
  it('同样的输入得到同样的输出（可复现）', () => {
    expect(renderQrAscii(buildUri(input, base))).toBe(renderQrAscii(buildUri(input, base)))
  })

  it('带静区：首尾各 2 行空白，且用全角块字符', () => {
    const art = renderQrAscii(buildUri(input, base))
    const lines = art.split('\n')
    expect(lines[0]?.trim()).toBe('')
    expect(lines[1]?.trim()).toBe('')
    expect(art).toContain('██')
    // 每行宽度一致（模块数固定）
    expect(new Set(lines.map((line) => line.length)).size).toBe(1)
  })

  it('内容变化则图案变化', () => {
    const a = renderQrAscii(buildUri(input, base))
    const b = renderQrAscii(buildUri({ ...input, account: 'other@example.com' }, base))
    expect(a).not.toBe(b)
  })
})

describe('otp-qr / transform', () => {
  it('输出 URI + 二维码', () => {
    const output = transform(input, base)
    expect(output.split('\n')[0]).toContain('otpauth://totp/')
    expect(output).toContain('██')
  })

  it('空输入返回空串（不生成二维码）', () => {
    expect(transform({ ...input, text: '' }, base)).toBe('')
    expect(transform({ ...input, text: '   ' }, hotp)).toBe('')
  })
})
