import { describe, expect, it } from 'vitest'
import { charsetOf, generateCaptcha, parseCharset, parseLength } from './utils'

const ZERO = () => 0

describe('captcha / parseLength', () => {
  it('默认 4，边界 3–8', () => {
    expect(parseLength('')).toBe(4)
    expect(parseLength('3')).toBe(3)
    expect(parseLength('8')).toBe(8)
    expect(() => parseLength('2')).toThrow(/长度无效/)
    expect(() => parseLength('9')).toThrow(/长度无效/)
  })
})

describe('captcha / parseCharset', () => {
  it('三种合法值，非法抛错', () => {
    expect(parseCharset('')).toBe('alnum')
    expect(parseCharset('ALPHA')).toBe('alpha')
    expect(() => parseCharset('hex')).toThrow(/字符集无效/)
  })
})

describe('captcha / charsetOf', () => {
  it('排除易混淆后不含 O/0/I/1/l', () => {
    const cs = charsetOf('alnum', true)
    for (const bad of ['O', '0', 'I', '1', 'l']) expect(cs).not.toContain(bad)
    expect(cs.length).toBeGreaterThan(40)
  })

  it('不排除时含数字与易混淆字符', () => {
    const cs = charsetOf('numeric', false)
    expect(cs).toBe('0123456789')
  })
})

describe('captcha / generateCaptcha', () => {
  it('文本长度与选项一致，字符来自字符集', () => {
    const spec = generateCaptcha({ length: '5', charset: 'alpha', noAmbiguous: true })
    expect(spec.text).toHaveLength(5)
    const cs = charsetOf('alpha', true)
    for (const ch of spec.text) expect(cs).toContain(ch)
  })

  it('干扰线 3–5 条、噪点 30–50 个', () => {
    const spec = generateCaptcha({ length: '4', charset: 'alnum', noAmbiguous: true })
    expect(spec.lines.length).toBeGreaterThanOrEqual(3)
    expect(spec.lines.length).toBeLessThanOrEqual(5)
    expect(spec.dots.length).toBeGreaterThanOrEqual(30)
    expect(spec.dots.length).toBeLessThanOrEqual(50)
  })

  it('旋转角在 ±20° 内', () => {
    const spec = generateCaptcha({ length: '6', charset: 'alnum', noAmbiguous: false })
    for (const c of spec.chars) {
      expect(Math.abs(c.rotation)).toBeLessThanOrEqual(Math.PI / 9 + 1e-9)
    }
  })

  it('确定性随机源可复现', () => {
    const a = generateCaptcha({ length: '4', charset: 'alnum', noAmbiguous: true }, ZERO)
    const b = generateCaptcha({ length: '4', charset: 'alnum', noAmbiguous: true }, ZERO)
    expect(a.text).toBe(b.text)
  })

  it('numeric 字符集只含数字', () => {
    const spec = generateCaptcha({ length: '8', charset: 'numeric', noAmbiguous: false })
    expect(spec.text).toMatch(/^\d{8}$/)
  })
})
