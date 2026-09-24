import { describe, expect, it } from 'vitest'
import { frequency, transform } from './utils'
import type { WordFrequencyOptions } from './schema'

const base: WordFrequencyOptions = { topN: '10', ignoreCase: true, useStopWords: false }

describe('word-frequency / frequency', () => {
  it('按次数降序排列', () => {
    const items = frequency('a a b', true, false, 10)
    expect(items[0]).toEqual({ word: 'a', count: 2, ratio: (2 / 3) * 100 })
    expect(items[1].word).toBe('b')
  })

  it('ignoreCase 开启时合并大小写', () => {
    expect(frequency('Tool tool', true, false, 10)).toHaveLength(1)
    expect(frequency('Tool tool', false, false, 10)).toHaveLength(2)
  })

  it('useStopWords 开启时过滤停用词', () => {
    const items = frequency('the cat and the dog', true, true, 10)
    expect(items.map((i) => i.word)).toEqual(['cat', 'dog'])
  })

  it('topN 限制返回条数', () => {
    expect(frequency('a b c d e', true, false, 2)).toHaveLength(2)
  })

  it('同次数按字典序排列', () => {
    const items = frequency('b a', true, false, 10)
    expect(items.map((i) => i.word)).toEqual(['a', 'b'])
  })
})

describe('word-frequency / transform', () => {
  it('输出形如「1. 词  次数  占比」的行', () => {
    expect(transform({ text: '工具 工具 库' }, base)).toContain('1. 工具  2')
  })

  it('全部被过滤时给出提示而不是空白', () => {
    expect(transform({ text: 'the and' }, { ...base, useStopWords: true })).toBe(
      '（过滤后没有剩余词）',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '  ' }, base)).toBe('')
  })
})
