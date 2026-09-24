import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('whitespace / transform', () => {
  const base = { trimLines: true, collapse: true, removeEmpty: true } as const

  it('默认三项全做', () => {
    expect(transform({ text: '  a  \n\n  b   c  \nd' }, base)).toBe('a\nb c\nd')
  })

  it('只去首尾空格（保留行内多空格）', () => {
    expect(transform({ text: ' a \n b  c ' }, { ...base, collapse: false })).toBe('a\nb  c')
  })

  it('只合并行内空白', () => {
    expect(
      transform({ text: 'a   b' }, { trimLines: false, collapse: true, removeEmpty: false }),
    ).toBe('a b')
  })

  it('关闭删除空行时空行保留', () => {
    expect(transform({ text: 'a\n\nb' }, { ...base, removeEmpty: false })).toBe('a\n\nb')
  })

  it('三项全关时原样返回', () => {
    const text = ' a \n\n b  c '
    expect(transform({ text }, { trimLines: false, collapse: false, removeEmpty: false })).toBe(
      text,
    )
  })

  it('制表符与不换行空格也按空白处理', () => {
    expect(transform({ text: 'a\t\t b' }, base)).toBe('a b')
  })

  it('换行统一为 LF', () => {
    expect(transform({ text: 'a\r\nb' }, base)).toBe('a\nb')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
