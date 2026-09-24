import { describe, expect, it } from 'vitest'
import { mulberry32, seedFrom, shuffle, transform } from './utils'

describe('shuffle / shuffle', () => {
  it('洗牌结果是原集合的排列', () => {
    const out = shuffle([1, 2, 3, 4, 5], mulberry32(1))
    expect([...out].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5])
  })

  it('不修改入参', () => {
    const input = ['a', 'b', 'c']
    shuffle(input, mulberry32(7))
    expect(input).toEqual(['a', 'b', 'c'])
  })

  it('空数组与单元素数组都能处理', () => {
    expect(shuffle([], mulberry32(1))).toEqual([])
    expect(shuffle(['a'], mulberry32(1))).toEqual(['a'])
  })
})

describe('shuffle / seedFrom', () => {
  it('同内容同种子，不同内容不同种子', () => {
    expect(seedFrom('abc')).toBe(seedFrom('abc'))
    expect(seedFrom('abc')).not.toBe(seedFrom('abd'))
  })
})

describe('shuffle / transform', () => {
  const line = { mode: 'line', stable: true } as const

  it('按行打乱：行集合不变', () => {
    const out = transform({ text: 'a\nb\nc' }, line)
    expect(out.split('\n').sort()).toEqual(['a', 'b', 'c'])
  })

  it('可复现：同输入两次结果一致', () => {
    expect(transform({ text: 'a\nb\nc' }, line)).toBe(transform({ text: 'a\nb\nc' }, line))
  })

  it('不同输入在可复现模式下结果不同', () => {
    expect(transform({ text: 'a\nb\nc' }, line)).not.toBe(transform({ text: 'a\nb\nd' }, line))
  })

  it('按词打乱：保留行数，词集合不变', () => {
    const out = transform({ text: 'hello world foo\nbar baz' }, { mode: 'word', stable: true })
    const lines = out.split('\n')
    expect(lines).toHaveLength(2)
    expect(lines[0].split(' ').sort()).toEqual(['foo', 'hello', 'world'])
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, line)).toBe('')
  })
})
