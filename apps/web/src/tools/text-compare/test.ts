import { describe, expect, it } from 'vitest'
import { charDiff, commonPrefix, commonSuffix, editDistance, similarity, transform } from './utils'

describe('text-compare / editDistance', () => {
  it('相同文本距离为 0', () => {
    expect(editDistance([...'abc'], [...'abc'])).toBe(0)
  })

  it('一次替换算 1', () => {
    expect(editDistance([...'abc'], [...'abd'])).toBe(1)
  })

  it('一次插入算 1', () => {
    expect(editDistance([...'ab'], [...'abc'])).toBe(1)
  })

  it('与空串比较等于对方长度', () => {
    expect(editDistance([], [...'abc'])).toBe(3)
    expect(editDistance([...'abc'], [])).toBe(3)
  })

  it('kitten 到 sitting 是 3', () => {
    expect(editDistance([...'kitten'], [...'sitting'])).toBe(3)
  })
})

describe('text-compare / similarity', () => {
  it('完全相同为 1', () => {
    expect(similarity('abc', 'abc')).toBe(1)
  })

  it('完全不同约为 0', () => {
    expect(similarity('abc', 'xyz')).toBe(0)
  })

  it('两边都空时为 1', () => {
    expect(similarity('', '')).toBe(1)
  })
})

describe('text-compare / 公共前后缀', () => {
  it('取公共前缀', () => {
    expect(commonPrefix('abcdef', 'abcxyz')).toBe('abc')
  })

  it('取公共后缀', () => {
    expect(commonSuffix('xabc', 'yabc')).toBe('abc')
  })

  it('没有公共部分时为空串', () => {
    expect(commonPrefix('abc', 'xyz')).toBe('')
  })
})

describe('text-compare / charDiff', () => {
  it('新增与删除分别用 + / - 标记', () => {
    const out = charDiff('ab', 'ac')
    expect(out).toContain('- b')
    expect(out).toContain('+ c')
  })
})

describe('text-compare / transform', () => {
  const base = { mode: 'report' } as const

  it('两边都为空时返回空串', () => {
    expect(transform({ text: '', textB: '' }, base)).toBe('')
  })

  it('报告里给出相似度与编辑距离', () => {
    const out = transform({ text: '这是第一句示例文本。', textB: '这是第二句示例文本。' }, base)
    expect(out).toContain('相似度：')
    expect(out).toContain('编辑距离：')
  })

  it('diff 模式走逐字符差异', () => {
    expect(transform({ text: 'ab', textB: 'ac' }, { mode: 'diff' })).toContain('+ c')
  })

  it('完全相同时给出说明', () => {
    expect(transform({ text: 'abc', textB: 'abc' }, base)).toContain('完全相同')
  })
})
