import { describe, expect, it } from 'vitest'
import { buildFlags, transform } from './utils'

describe('regex-replace / buildFlags', () => {
  it('按开关拼标志', () => {
    expect(
      buildFlags({
        pattern: 'a',
        replacement: '',
        global: true,
        ignoreCase: true,
        multiline: false,
      }),
    ).toBe('gi')
    expect(
      buildFlags({
        pattern: 'a',
        replacement: '',
        global: false,
        ignoreCase: false,
        multiline: true,
      }),
    ).toBe('m')
  })
})

describe('regex-replace / transform', () => {
  const base = {
    pattern: 'a',
    replacement: 'X',
    global: true,
    ignoreCase: false,
    multiline: false,
  } as const

  it('分组引用 $1 / $2', () => {
    const out = transform(
      { text: 'alice@example.com' },
      { ...base, pattern: '(\\w+)@(\\w+)', replacement: '$2@$1' },
    )
    expect(out).toBe('example@alice.com')
  })

  it('$& 引用整个匹配', () => {
    expect(transform({ text: 'abc' }, { ...base, pattern: 'b', replacement: '[$&]' })).toBe('a[b]c')
  })

  it('命名分组 $<name>', () => {
    const out = transform(
      { text: '2026-01-02' },
      { ...base, pattern: '(?<y>\\d{4})-(?<d>\\d{2})', replacement: '$<d>/$<y>' },
    )
    expect(out).toBe('01/2026-02')
  })

  it('取消全局只替换第一处', () => {
    expect(transform({ text: 'aaa' }, { ...base, global: false })).toBe('Xaa')
  })

  it('忽略大小写', () => {
    expect(transform({ text: 'AaA' }, { ...base, ignoreCase: true })).toBe('XXX')
  })

  it('多行模式让 ^ 匹配每行开头', () => {
    const out = transform(
      { text: 'a\nb' },
      { ...base, pattern: '^', replacement: '- ', multiline: true },
    )
    expect(out).toBe('- a\n- b')
  })

  it('空正则原样返回', () => {
    expect(transform({ text: 'abc' }, { ...base, pattern: '' })).toBe('abc')
  })

  it('非法正则会抛错（由模板捕获展示）', () => {
    expect(() => transform({ text: 'a' }, { ...base, pattern: '(' })).toThrow()
  })

  it('匹配不到时原样返回', () => {
    expect(transform({ text: 'abc' }, { ...base, pattern: 'zzz' })).toBe('abc')
  })
})
