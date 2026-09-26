import { describe, expect, it } from 'vitest'
import { assertMode, charDiff, transform, unifiedDiff } from './utils'

describe('code-diff / unifiedDiff', () => {
  it('输出 ---/+++ 头与 @@ hunk', () => {
    const out = unifiedDiff('a\nb\nc', 'a\nx\nc')
    expect(out).toContain('--- 旧版 (a)')
    expect(out).toContain('+++ 新版 (b)')
    expect(out).toContain('@@ -')
    expect(out).toContain('- b')
    expect(out).toContain('+ x')
  })

  it('完全相同时给出提示', () => {
    expect(unifiedDiff('a\nb', 'a\nb')).toBe('(两段代码完全相同)')
  })

  it('新版为空等于整段删除', () => {
    const out = unifiedDiff('a\nb', '')
    expect(out).toContain('- a')
    expect(out).toContain('- b')
  })

  it('旧版为空时 hunk 起始行为 0', () => {
    const out = unifiedDiff('', 'a')
    expect(out).toContain('@@ -0,0 +1,1 @@')
    expect(out).not.toContain('--1')
  })

  it('新版为空时 hunk 起始行为 0', () => {
    const out = unifiedDiff('a\nb', '')
    expect(out).toContain('@@ -1,2 +0,0 @@')
    expect(out).not.toContain('+-1')
  })

  it('开头新增行时旧文件起始行为 0', () => {
    const out = unifiedDiff('b', 'a\nb')
    expect(out).toContain('@@ -0,1 +1,2 @@')
  })

  it('上下文行以空格前缀保留', () => {
    const out = unifiedDiff('a\nb\nc', 'a\nB\nc')
    expect(out).toContain('  a')
    expect(out).toContain('  c')
  })
})

describe('code-diff / charDiff', () => {
  it('字符级标出改动字符', () => {
    const out = charDiff('abc', 'abd')
    expect(out).toContain('- c')
    expect(out).toContain('+ d')
  })

  it('完全相同给出提示', () => {
    expect(charDiff('ab', 'ab')).toBe('(两段代码完全相同)')
  })
})

describe('code-diff / transform', () => {
  const line = { mode: 'line' } as const

  it('两段都空返回空串', () => {
    expect(transform({ text: '', textB: '' }, line)).toBe('')
  })

  it('模式选择走 line/char', () => {
    expect(transform({ text: 'a-b', textB: 'a+b' }, line)).toContain('@@')
    expect(transform({ text: 'a-b', textB: 'a+b' }, { mode: 'char' })).toContain('+ +')
  })

  it('非法模式报错', () => {
    expect(() => assertMode('word')).toThrow(/不支持的模式/)
    const bad = { mode: 'word' } as never
    expect(() => transform({ text: 'a', textB: 'b' }, bad)).toThrow(/不支持的模式/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001), textB: '' }, line)).toThrow(/上限/)
  })

  it('只填旧版时整段标删', () => {
    expect(transform({ text: 'hello', textB: '' }, line)).toContain('- hello')
  })
})
