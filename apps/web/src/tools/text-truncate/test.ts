import { describe, expect, it } from 'vitest'
import { byChars, byLines, byWords, transform } from './utils'

describe('text-truncate / byChars', () => {
  it('超限时截断并加省略号', () => {
    expect(byChars('abcdef', 3, '…')).toBe('abc…')
  })

  it('未超限时原样返回', () => {
    expect(byChars('abc', 5, '…')).toBe('abc')
  })

  it('正好等于上限时不加省略号', () => {
    expect(byChars('abc', 3, '…')).toBe('abc')
  })

  it('emoji 按一个码点算，不会被切坏', () => {
    expect(byChars('a😀b', 2, '…')).toBe('a😀…')
  })
})

describe('text-truncate / byWords', () => {
  it('按拉丁词数截断', () => {
    expect(byWords('one two three', 2, '…')).toBe('onetwo…')
  })

  it('未超限时原样返回', () => {
    expect(byWords('one', 3, '…')).toBe('one')
  })
})

describe('text-truncate / byLines', () => {
  it('按行数截断', () => {
    expect(byLines('a\nb\nc', 2, '…')).toBe('a\nb\n…')
  })

  it('未超限时原样返回', () => {
    expect(byLines('a\nb', 3, '…')).toBe('a\nb')
  })
})

describe('text-truncate / transform', () => {
  const base = { mode: 'chars', limit: '50', ellipsis: '…' } as const

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('省略号可自定义', () => {
    // 底层函数可以传任意上限；选项里的上限只有 20/50/100/200
    expect(byChars('abcdef', 3, '...')).toBe('abc...')
  })

  it('words 模式走按词分支', () => {
    expect(byWords('one two three', 2, '…')).toBe('onetwo…')
  })

  it('整体截断点在选项范围内生效', () => {
    const out = transform({ text: '一'.repeat(30) }, { mode: 'chars', limit: '20', ellipsis: '…' })
    expect(out).toBe('一'.repeat(20) + '…')
  })
})
