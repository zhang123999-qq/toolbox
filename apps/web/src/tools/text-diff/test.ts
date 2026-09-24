import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('text-diff / transform', () => {
  const base = { mode: 'line' } as const

  it('行级：新增行标 +', () => {
    const out = transform({ text: 'a\nb', textB: 'a\nb\nc' }, base)
    expect(out).toContain('+ c')
  })

  it('行级：删除行标 -', () => {
    const out = transform({ text: 'a\nb\nc', textB: 'a\nc' }, base)
    expect(out).toContain('- b')
  })

  it('行级：未变的行标空格', () => {
    const out = transform({ text: 'a\nb', textB: 'a\nc' }, base)
    expect(out.split('\n')[0]).toBe('  a')
  })

  it('字符级：只标出真正改动的字符', () => {
    const out = transform({ text: 'abc', textB: 'abd' }, { mode: 'char' })
    expect(out).toContain('- c')
    expect(out).toContain('+ d')
    expect(out).toContain('  ab')
  })

  it('两段完全相同时全部标为未变', () => {
    const out = transform({ text: 'a\nb', textB: 'a\nb' }, base)
    expect(out).toBe('  a\n  b')
  })

  it('新版为空等于全删', () => {
    expect(transform({ text: 'a', textB: '' }, base)).toBe('- a')
  })

  it('两边都为空返回空串（边界）', () => {
    expect(transform({ text: '', textB: '' }, base)).toBe('')
  })
})
