import { describe, expect, it } from 'vitest'
import { parseColumnExpr, transform } from './utils'

describe('extract-column / parseColumnExpr', () => {
  it('单个列号', () => {
    expect(parseColumnExpr('2', 5)).toEqual([2])
  })

  it('多个列号去重并升序', () => {
    expect(parseColumnExpr('3,1,3', 5)).toEqual([1, 3])
  })

  it('闭区间范围', () => {
    expect(parseColumnExpr('1-3', 5)).toEqual([1, 2, 3])
  })

  it('开放范围取到最大列数', () => {
    expect(parseColumnExpr('2-', 4)).toEqual([2, 3, 4])
  })

  it('省略起点的范围从 1 开始', () => {
    expect(parseColumnExpr('-2', 5)).toEqual([1, 2])
  })

  it('非法片段与 0 被忽略', () => {
    expect(parseColumnExpr('1,abc,0,x', 3)).toEqual([1])
  })
})

describe('extract-column / transform', () => {
  const base = { delimiter: 'comma', columns: '2', joiner: '\t', skipMissing: false } as const

  it('提取单列（行之间仍用换行分隔）', () => {
    expect(transform({ text: 'a,b,c\n1,2,3' }, base)).toBe('b\n2')
  })

  it('提取多列：去重后按列号升序输出', () => {
    expect(transform({ text: 'a,b,c\n1,2,3' }, { ...base, columns: '3,1' })).toBe('a\tc\n1\t3')
  })

  it('范围表达式', () => {
    expect(transform({ text: 'a,b,c' }, { ...base, columns: '1-2' })).toBe('a\tb')
  })

  it('自定义连接符', () => {
    expect(transform({ text: 'a,b,c' }, { ...base, columns: '1,3', joiner: ' / ' })).toBe('a / c')
  })

  it('列缺失默认填空串', () => {
    expect(transform({ text: 'a\nb,c' }, { ...base, columns: '2' })).toBe('\nc')
  })

  it('skipMissing 时跳过缺失列', () => {
    expect(transform({ text: 'a\nb,c' }, { ...base, columns: '1,2', skipMissing: true })).toBe(
      'a\nb\tc',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
