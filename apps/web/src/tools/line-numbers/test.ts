import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('line-numbers / transform', () => {
  const base = { format: 'dot', align: true, skipEmpty: false } as const

  it('默认用「1. 」格式', () => {
    expect(transform({ text: 'a\nb' }, base)).toBe('1. a\n2. b')
  })

  it('冒号格式', () => {
    expect(transform({ text: 'a' }, { ...base, format: 'colon' })).toBe('1: a')
  })

  it('竖线格式', () => {
    expect(transform({ text: 'a' }, { ...base, format: 'pipe' })).toBe('1 | a')
  })

  it('方括号格式', () => {
    expect(transform({ text: 'a' }, { ...base, format: 'bracket' })).toBe('[1] a')
  })

  it('超过 9 行时按位数左补空格对齐', () => {
    const text = Array.from({ length: 11 }, (_, i) => 'x' + (i + 1)).join('\n')
    const out = transform({ text }, base)
    expect(out.split('\n')[0]).toBe(' 1. x1')
    expect(out.split('\n')[10]).toBe('11. x11')
  })

  it('关闭对齐时不补空格', () => {
    const text = Array.from({ length: 11 }, (_, i) => 'x' + (i + 1)).join('\n')
    expect(transform({ text }, { ...base, align: false }).split('\n')[0]).toBe('1. x1')
  })

  it('跳过空行时编号连续', () => {
    expect(transform({ text: 'a\n\nb' }, { ...base, skipEmpty: true })).toBe('1. a\n\n2. b')
  })

  it('不跳过空行时空行也占号', () => {
    expect(transform({ text: 'a\n\nb' }, base)).toBe('1. a\n2. \n3. b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
