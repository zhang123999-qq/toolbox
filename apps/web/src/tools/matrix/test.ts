import { describe, expect, it } from 'vitest'
import { formatGrid, parseMatrix, transform } from './utils'

const inverse = { operation: 'inverse' } as const
const add = { operation: 'add' } as const
const multiply = { operation: 'multiply' } as const
const determinant = { operation: 'determinant' } as const
const transpose = { operation: 'transpose' } as const

describe('matrix / parseMatrix', () => {
  it('空格分隔、换行分行', () => {
    expect(parseMatrix('1 2\n3 4')).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('分号分行、逗号分隔', () => {
    expect(parseMatrix('1,2;3,4')).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('JSON 数组形式', () => {
    expect(parseMatrix('[[1,2],[3,4]]')).toEqual([
      [1, 2],
      [3, 4],
    ])
  })

  it('支持小数与科学记数法', () => {
    expect(parseMatrix('0.5 -1e2')).toEqual([[0.5, -100]])
  })

  it('非矩形报错', () => {
    expect(() => parseMatrix('1 2\n3')).toThrow(/不是矩形/)
  })

  it('非数字报错', () => {
    expect(() => parseMatrix('1 x')).toThrow(/不是数字/)
  })

  it('尺寸超限报错', () => {
    expect(() => parseMatrix('1 '.repeat(21).trim())).toThrow(/尺寸过大/)
  })
})

describe('matrix / 运算', () => {
  it('加法', () => {
    const out = transform({ text: '1 2\n3 4', textB: '5 6\n7 8' }, add)
    expect(out).toContain('结果：')
    // 6 8 / 10 12（对齐后含前导空格）
    expect(out).toContain('6')
    expect(out).toContain('12')
  })

  it('乘法', () => {
    const out = transform({ text: '1 2\n3 4', textB: '2 0\n1 2' }, multiply)
    // [[1*2+2*1, 0+4],[6+4, 0+8]] = [[4,4],[10,8]]
    expect(out).toContain('4')
    expect(out).toContain('10')
    expect(out).toContain('8')
  })

  it('乘法维度不匹配报错', () => {
    expect(() => transform({ text: '1 2 3', textB: '1 2' }, multiply)).toThrow(/维度不匹配/)
  })

  it('行列式 det([[1,2],[3,4]]) = -2', () => {
    const out = transform({ text: '1 2\n3 4', textB: '' }, determinant)
    expect(out).toContain('det(A) = -2')
  })

  it('逆矩阵 [[1,2],[3,4]]⁻¹ = [[-2,1],[1.5,-0.5]]', () => {
    const out = transform({ text: '1 2\n3 4', textB: '' }, inverse)
    expect(out).toContain('-2')
    expect(out).toContain('1.5')
    expect(out).toContain('-0.5')
  })

  it('奇异矩阵求逆报错', () => {
    expect(() => transform({ text: '1 2\n2 4', textB: '' }, inverse)).toThrow(/奇异/)
  })

  it('非方阵求行列式报错', () => {
    expect(() => transform({ text: '1 2 3\n4 5 6', textB: '' }, determinant)).toThrow(/方阵/)
  })

  it('转置', () => {
    const out = transform({ text: '1 2 3\n4 5 6', textB: '' }, transpose)
    expect(out).toContain('Aᵀ（3×2）')
  })

  it('加法维度不一致报错', () => {
    expect(() => transform({ text: '1 2', textB: '1 2\n3 4' }, add)).toThrow(/维度不匹配/)
  })

  it('加法缺矩阵 B 报错', () => {
    expect(() => transform({ text: '1 2', textB: '' }, add)).toThrow(/矩阵 B/)
  })
})

describe('matrix / transform 基础', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, inverse)).toBe('')
  })

  it('formatGrid 对齐列', () => {
    expect(
      formatGrid([
        [1, 200],
        [30, 4],
      ]),
    ).toBe(' 1  200\n30    4')
  })
})
