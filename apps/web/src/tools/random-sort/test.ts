import { describe, expect, it } from 'vitest'
import { parseItems, shuffle, transform } from './utils'

const noOptions = {}
/** 确定性随机源：恒返回 0，便于断言 */
const randZero = () => 0

describe('random-sort / parseItems', () => {
  it('按行切分并丢弃空行与首尾空白', () => {
    expect(parseItems('  a  \n\nb\n   \nc  ')).toEqual(['a', 'b', 'c'])
  })

  it('空输入得到空数组', () => {
    expect(parseItems('')).toEqual([])
  })
})

describe('random-sort / shuffle（Fisher-Yates）', () => {
  it('不修改原数组，元素不重不漏', () => {
    const input = ['a', 'b', 'c', 'd']
    const out = shuffle(input, randZero)
    expect(input).toEqual(['a', 'b', 'c', 'd'])
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('确定性随机源下结果可复现', () => {
    const input = ['a', 'b', 'c']
    expect(shuffle(input, randZero)).toEqual(shuffle(input, randZero))
  })

  it('空数组与单元素数组直接返回', () => {
    expect(shuffle([], randZero)).toEqual([])
    expect(shuffle(['only'], randZero)).toEqual(['only'])
  })

  it('默认随机源为 Math.random（不传 rand 也能跑）', () => {
    const out = shuffle(['a', 'b', 'c', 'd', 'e'])
    expect([...out].sort()).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('random-sort / transform', () => {
  it('空输入 → 空串（不进入错误态）', () => {
    expect(transform({ text: '' }, noOptions)).toBe('')
    expect(transform({ text: '  \n ' }, noOptions)).toBe('')
  })

  it('单行输入原样输出', () => {
    expect(transform({ text: 'only' }, noOptions, randZero)).toBe('only')
  })

  it('多行输入：行数不变、集合不变', () => {
    const out = transform({ text: 'a\nb\nc\nd' }, noOptions, randZero)
    const lines = out.split('\n')
    expect(lines).toHaveLength(4)
    expect([...lines].sort()).toEqual(['a', 'b', 'c', 'd'])
  })

  it('空行被忽略', () => {
    const out = transform({ text: 'a\n\nb\n' }, noOptions, randZero)
    expect(out.split('\n')).toHaveLength(2)
  })
})
