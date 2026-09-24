import { describe, expect, it } from 'vitest'
import { leadingNumber, transform } from './utils'

describe('sort / leadingNumber', () => {
  it('取行内第一个数字', () => {
    expect(leadingNumber('item 42 x')).toBe(42)
    expect(leadingNumber('a -3.5 b')).toBe(-3.5)
  })

  it('没有数字时返回 null', () => {
    expect(leadingNumber('没有数字')).toBeNull()
  })
})

describe('sort / transform', () => {
  const base = { sortBy: 'text', descending: false, ignoreCase: false } as const

  it('字典序升序', () => {
    expect(transform({ text: 'banana\napple\ncherry' }, base)).toBe('apple\nbanana\ncherry')
  })

  it('降序', () => {
    expect(transform({ text: 'a\nb\nc' }, { ...base, descending: true })).toBe('c\nb\na')
  })

  it('忽略大小写排序', () => {
    expect(transform({ text: 'B\na\nC' }, { ...base, ignoreCase: true })).toBe('a\nB\nC')
  })

  it('按长度排序', () => {
    expect(transform({ text: 'aaa\na\naa' }, { ...base, sortBy: 'length' })).toBe('a\naa\naaa')
  })

  it('按数字排序（不是按字符串）', () => {
    expect(transform({ text: 'item 10\nitem 2\nitem 1' }, { ...base, sortBy: 'number' })).toBe(
      'item 1\nitem 2\nitem 10',
    )
  })

  it('数字模式下没有数字的行排最后', () => {
    expect(transform({ text: 'no num\nitem 2' }, { ...base, sortBy: 'number' })).toBe(
      'item 2\nno num',
    )
  })

  it('排序稳定：相等项保持原顺序', () => {
    expect(transform({ text: 'b1\na\nb2' }, { ...base, sortBy: 'length' })).toBe('a\nb1\nb2')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
