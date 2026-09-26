import { describe, expect, it } from 'vitest'
import { digitToSymbol, parseChmod, symbolToDigit, transform } from './utils'

describe('chmod / 双向转换', () => {
  it('数字 → 符号', () => {
    expect(digitToSymbol(7)).toBe('rwx')
    expect(digitToSymbol(5)).toBe('r-x')
    expect(digitToSymbol(0)).toBe('---')
    expect(digitToSymbol(6)).toBe('rw-')
  })

  it('符号 → 数字', () => {
    expect(symbolToDigit('rwx')).toBe(7)
    expect(symbolToDigit('r-x')).toBe(5)
    expect(symbolToDigit('---')).toBe(0)
    expect(symbolToDigit('rw-')).toBe(6)
  })

  it('755 → rwxr-xr-x', () => {
    expect(parseChmod('755')).toEqual({ numeric: '755', symbolic: 'rwxr-xr-x' })
  })

  it('rwxr-xr-x → 755', () => {
    expect(parseChmod('rwxr-xr-x')).toEqual({ numeric: '755', symbolic: 'rwxr-xr-x' })
  })

  it('644 与 rw-r--r-- 互通', () => {
    expect(parseChmod('644').symbolic).toBe('rw-r--r--')
    expect(parseChmod('rw-r--r--').numeric).toBe('644')
  })

  it('非法输入抛中文错', () => {
    expect(() => parseChmod('abc')).toThrow(/无法识别/)
    expect(() => parseChmod('888')).toThrow(/无法识别/)
  })

  it('4 位数字保留 SUID/SGID/sticky 并渲染 s/t', () => {
    expect(parseChmod('4755')).toEqual({ numeric: '4755', symbolic: 'rwsr-xr-x' })
    expect(parseChmod('2755')).toEqual({ numeric: '2755', symbolic: 'rwxr-sr-x' })
    expect(parseChmod('1777')).toEqual({ numeric: '1777', symbolic: 'rwxrwxrwt' })
  })

  it('无执行权限的特殊位渲染为大写 S/T', () => {
    expect(parseChmod('4644')).toEqual({ numeric: '4644', symbolic: 'rwSr--r--' })
    expect(parseChmod('1644')).toEqual({ numeric: '1644', symbolic: 'rw-r--r-T' })
  })

  it('符号 s/t 反解回特殊位数字', () => {
    expect(parseChmod('rwsr-xr-x').numeric).toBe('4755')
    expect(parseChmod('rwxr-sr-x').numeric).toBe('2755')
    expect(parseChmod('rwxrwxrwt').numeric).toBe('1777')
    expect(parseChmod('rwSr--r--').numeric).toBe('4644')
  })

  it('s/S 出现在非法位置时报错', () => {
    expect(() => parseChmod('rwxrwxrws')).toThrow() // s 不能在其他人位
    expect(() => parseChmod('rwt------')).toThrow() // t 只能在其他人位
  })
})

describe('chmod / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' })).toBe('')
  })

  it('输出权限表与等价命令', () => {
    const out = transform({ text: '755' })
    expect(out).toContain('数字权限：755')
    expect(out).toContain('符号权限：rwxr-xr-x')
    expect(out).toContain('chmod 755 <文件>')
    expect(out).toContain('chmod u=rwx,g=r-x,o=r-x <文件>')
  })

  it('符号输入也能输出数字', () => {
    expect(transform({ text: 'rw-------' })).toContain('数字权限：600')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) })).toThrow(/上限/)
  })
})
