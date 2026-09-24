import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('split-columns / transform', () => {
  const base = { delimiter: 'auto', mode: 'list' } as const

  it('list 模式用竖线连接各列', () => {
    expect(transform({ text: 'a,b\n1,2' }, base)).toBe('a | b\n1 | 2')
  })

  it('自动识别制表符', () => {
    expect(transform({ text: 'a\tb\n1\t2' }, base)).toBe('a | b\n1 | 2')
  })

  it('numbered 模式列出列号', () => {
    const out = transform({ text: 'a,b' }, { delimiter: 'comma', mode: 'numbered' })
    expect(out).toBe('第 1 行（2 列）\n  [1] a\n  [2] b')
  })

  it('count 模式统计列数分布', () => {
    const out = transform({ text: 'a,b\n1,2\n3' }, { delimiter: 'comma', mode: 'count' })
    expect(out).toBe('1 列：1 行\n2 列：2 行')
  })

  it('引号内的分隔符不参与切分', () => {
    expect(transform({ text: '"x,y",z' }, { delimiter: 'comma', mode: 'list' })).toBe('x,y | z')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
