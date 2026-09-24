import { describe, expect, it } from 'vitest'
import { chartData, lengthBuckets, statsText, topWords } from './utils'

describe('text-stats / topWords', () => {
  it('按频次降序取前 N', () => {
    expect(topWords('苹果 香蕉 苹果 橘子 香蕉 苹果', 2)).toEqual([
      ['苹果', 3],
      ['香蕉', 2],
    ])
  })

  it('过滤停用词', () => {
    expect(topWords('的 的 的 苹果', 5).map(([w]) => w)).not.toContain('的')
  })

  it('空文本返回空数组', () => {
    expect(topWords('', 5)).toEqual([])
  })
})

describe('text-stats / lengthBuckets', () => {
  it('按行长分桶并升序排列', () => {
    const buckets = lengthBuckets('a\nbb\nccc\ndddd')
    expect(buckets.length).toBeGreaterThan(1)
    expect(Number(buckets[0][0])).toBeLessThan(Number(buckets[buckets.length - 1][0]))
  })

  it('空行不计入', () => {
    expect(lengthBuckets('\n\n')).toEqual([])
  })
})

describe('text-stats / chartData', () => {
  const base = { metric: 'freq', limit: '10' } as const

  it('freq 指标给词频', () => {
    expect(chartData('苹果 苹果 香蕉', base).labels[0]).toBe('苹果')
  })

  it('length 指标给长度分布', () => {
    const data = chartData('a\nbbbb', { metric: 'length', limit: '10' })
    expect(data.values.reduce((sum, n) => sum + n, 0)).toBe(2)
  })
})

describe('text-stats / statsText', () => {
  const base = { metric: 'freq', limit: '10' } as const

  it('带标题且每行一个条目', () => {
    const out = statsText({ text: '苹果 苹果 香蕉' }, base)
    expect(out.split('\n')[0]).toContain('词频')
    expect(out).toContain('苹果\t2')
  })

  it('空输入返回空串', () => {
    expect(statsText({ text: '   ' }, base)).toBe('')
  })

  it('只含停用词时给出说明', () => {
    expect(statsText({ text: 'the the a an' }, base)).toBe('没有可统计的内容。')
  })
})
