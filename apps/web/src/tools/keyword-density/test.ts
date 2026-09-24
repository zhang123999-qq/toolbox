import { describe, expect, it } from 'vitest'
import { density, transform } from './utils'

describe('keyword-density / density', () => {
  it('密度 = 出现次数 / 总词数', () => {
    const items = density('cat cat dog', 10)
    expect(items[0]).toEqual({ word: 'cat', count: 2, density: (2 / 3) * 100 })
  })

  it('过滤停用词，不计入结果也不计入排名', () => {
    const items = density('the cat the dog', 10)
    expect(items.map((i) => i.word)).toEqual(['cat', 'dog'])
  })

  it('topN 限制返回条数', () => {
    expect(density('cat dog bird fish', 2)).toHaveLength(2)
  })

  it('空文本不产生除零（边界）', () => {
    expect(density('', 10)).toEqual([])
  })
})

describe('keyword-density / transform', () => {
  it('输出「词：次数，密度 X%」的行', () => {
    expect(transform({ text: 'cat cat dog' }, { topN: '10' })).toContain('cat：2 次，密度 66.67%')
  })

  it('全为停用词时给出提示', () => {
    expect(transform({ text: 'the and' }, { topN: '10' })).toBe('（过滤停用词后没有剩余词）')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { topN: '10' })).toBe('')
  })
})
