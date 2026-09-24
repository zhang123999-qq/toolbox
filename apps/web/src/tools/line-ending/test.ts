import { describe, expect, it } from 'vitest'
import { detectEndings, toEnding, transform } from './utils'

describe('line-ending / detectEndings', () => {
  it('CRLF 不重复计入 LF 与 CR', () => {
    expect(detectEndings('a\r\nb')).toEqual({ crlf: 1, lf: 0, cr: 0 })
  })

  it('混合换行分别统计', () => {
    expect(detectEndings('a\r\nb\nc\rd')).toEqual({ crlf: 1, lf: 1, cr: 1 })
  })

  it('没有换行时全为 0', () => {
    expect(detectEndings('abc')).toEqual({ crlf: 0, lf: 0, cr: 0 })
  })
})

describe('line-ending / toEnding', () => {
  it('CRLF → LF', () => {
    expect(toEnding('a\r\nb', 'lf')).toBe('a\nb')
  })

  it('LF → CRLF', () => {
    expect(toEnding('a\nb', 'crlf')).toBe('a\r\nb')
  })

  it('LF → CR', () => {
    expect(toEnding('a\nb', 'cr')).toBe('a\rb')
  })

  it('CR → LF', () => {
    expect(toEnding('a\rb', 'lf')).toBe('a\nb')
  })

  it('混合换行一起归一', () => {
    expect(toEnding('a\r\nb\nc\r', 'lf')).toBe('a\nb\nc\n')
  })

  it('没有换行时原样返回', () => {
    expect(toEnding('abc', 'crlf')).toBe('abc')
  })
})

describe('line-ending / transform', () => {
  it('默认转成 LF', () => {
    expect(transform({ text: 'a\r\nb' }, { target: 'lf' })).toBe('a\nb')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { target: 'lf' })).toBe('')
  })
})
