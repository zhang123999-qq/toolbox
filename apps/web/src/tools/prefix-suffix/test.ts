import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('prefix-suffix / transform', () => {
  const base = { prefix: '- ', suffix: '', skipEmpty: true } as const

  it('每行加前缀', () => {
    expect(transform({ text: 'a\nb' }, base)).toBe('- a\n- b')
  })

  it('加后缀', () => {
    expect(transform({ text: 'a\nb' }, { ...base, suffix: ';' })).toBe('- a;\n- b;')
  })

  it('前后缀都为空时原样返回', () => {
    expect(transform({ text: 'a\nb' }, { prefix: '', suffix: '', skipEmpty: true })).toBe('a\nb')
  })

  it('默认跳过空行', () => {
    expect(transform({ text: 'a\n\nb' }, base)).toBe('- a\n\n- b')
  })

  it('取消跳过后空行也加前后缀', () => {
    expect(transform({ text: 'a\n\nb' }, { ...base, skipEmpty: false })).toBe('- a\n- \n- b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
