import { describe, expect, it } from 'vitest'
import { editsOf, mergeLines, mergeText, transform } from './utils'

describe('text-merge / editsOf', () => {
  it('替换一行', () => {
    expect(editsOf(['a', 'b'], ['a', 'c'])).toEqual([{ start: 1, removed: 1, inserted: ['c'] }])
  })

  it('纯插入', () => {
    expect(editsOf(['a', 'b'], ['a', 'x', 'b'])).toEqual([
      { start: 1, removed: 0, inserted: ['x'] },
    ])
  })

  it('删除', () => {
    expect(editsOf(['a', 'b'], ['a'])).toEqual([{ start: 1, removed: 1, inserted: [] }])
  })

  it('无差异时没有编辑', () => {
    expect(editsOf(['a'], ['a'])).toEqual([])
  })
})

describe('text-merge / mergeLines', () => {
  it('只有一方改动时采用改动', () => {
    expect(mergeLines(['a', 'b', 'c'], ['a', 'b', 'c'], ['a', 'b', 'x'], 'auto')).toEqual({
      text: 'a\nb\nx',
      conflict: false,
    })
    expect(mergeLines(['a', 'b', 'c'], ['a', 'x', 'c'], ['a', 'b', 'c'], 'auto')).toEqual({
      text: 'a\nx\nc',
      conflict: false,
    })
  })

  it('两边改动一致时不算冲突', () => {
    expect(mergeLines(['a', 'b'], ['a', 'x'], ['a', 'x'], 'auto').conflict).toBe(false)
  })

  it('改动不重叠时能自动合并', () => {
    const result = mergeLines(['a', 'b', 'c'], ['a', '我的', 'c'], ['a', 'b', '他人'], 'auto')
    expect(result.conflict).toBe(false)
    expect(result.text).toBe('a\n我的\n他人')
  })

  it('一方新增、另一方改别处也能合并', () => {
    const result = mergeLines(['a', 'b'], ['a', 'x', 'b'], ['a', 'y'], 'auto')
    expect(result.conflict).toBe(false)
    expect(result.text).toBe('a\nx\ny')
  })

  it('改动同一行时判冲突（auto 标标记）', () => {
    const result = mergeLines(['a', 'b', 'c'], ['a', '我的', 'c'], ['a', '他人', 'c'], 'auto')
    expect(result.conflict).toBe(true)
    expect(result.text).toContain('<<<<<<< 我的版本')
    expect(result.text).toContain('>>>>>>> 他人版本')
  })

  it('冲突时可按偏好取一方', () => {
    const merged = mergeLines(['a', 'b'], ['a', '我的'], ['a', '他人'], 'mine')
    expect(merged.text).toBe('a\n我的')
    expect(mergeLines(['a', 'b'], ['a', '我的'], ['a', '他人'], 'theirs').text).toBe('a\n他人')
  })
})

describe('text-merge / mergeText', () => {
  it('CRLF 输入按 LF 输出', () => {
    expect(mergeText('a\r\nb', 'a\r\nx', 'a\r\nb', 'auto').text).toBe('a\nx')
  })
})

describe('text-merge / transform', () => {
  const base = { prefer: 'auto' } as const

  it('冲突时末尾附说明', () => {
    const out = transform({ text: 'a\nb\nc', textB: 'a\n我的\nc', textC: 'a\n他人\nc' }, base)
    expect(out).toContain('请人工确认')
  })

  it('取一方时也提示改动被丢弃', () => {
    const out = transform(
      { text: 'a\nb\nc', textB: 'a\n我的\nc', textC: 'a\n他人\nc' },
      { prefer: 'mine' },
    )
    expect(out).toContain('另一方的改动被丢弃')
  })

  it('三方全为空时返回空串（边界）', () => {
    expect(transform({ text: '', textB: '', textC: '' }, base)).toBe('')
  })
})
