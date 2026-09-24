import { describe, expect, it } from 'vitest'
import { keyOf, transform } from './utils'

describe('dedupe / keyOf', () => {
  const base = { ignoreCase: false, trimLines: false, keepEmpty: false } as const

  it('默认原样比较', () => {
    expect(keyOf('  A  ', base)).toBe('  A  ')
  })

  it('trimLines 去首尾空白', () => {
    expect(keyOf('  A  ', { ...base, trimLines: true })).toBe('A')
  })

  it('ignoreCase 转小写', () => {
    expect(keyOf('A', { ...base, ignoreCase: true })).toBe('a')
  })
})

describe('dedupe / transform', () => {
  const base = { ignoreCase: false, trimLines: false, keepEmpty: false } as const

  it('按行去重并保留首次出现的顺序', () => {
    expect(transform({ text: 'a\nb\na\nc\nb' }, base)).toBe('a\nb\nc')
  })

  it('默认区分大小写', () => {
    expect(transform({ text: 'A\na\nB' }, base)).toBe('A\na\nB')
  })

  it('ignoreCase 把 A 与 a 视为同一行', () => {
    expect(transform({ text: 'A\na\nB' }, { ...base, ignoreCase: true })).toBe('A\nB')
  })

  it('trimLines 忽略首尾空白差异（保留首次出现的原文）', () => {
    expect(transform({ text: 'a \na' }, { ...base, trimLines: true })).toBe('a ')
  })

  it('默认丢弃空行', () => {
    expect(transform({ text: 'a\n\nb\n\n' }, base)).toBe('a\nb')
  })

  it('keepEmpty 时保留第一个空行', () => {
    expect(transform({ text: 'a\n\nb\n\n' }, { ...base, keepEmpty: true })).toBe('a\n\nb')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
