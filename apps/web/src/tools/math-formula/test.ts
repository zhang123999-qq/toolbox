/**
 * math-formula（#824）utils 单测：公式代入计算与变量解析。
 */
import { describe, expect, it } from 'vitest'
import {
  calcFormula,
  FORMULAS,
  formulasByCategory,
  getFormula,
  listFormulas,
  parseVars,
} from './utils'

describe('FORMULAS', () => {
  it('共 14 条公式，id 唯一', () => {
    expect(FORMULAS).toHaveLength(14)
    expect(new Set(FORMULAS.map((f) => f.id)).size).toBe(14)
  })
  it('每条公式变量齐备', () => {
    for (const f of FORMULAS) {
      expect(f.vars.length).toBeGreaterThan(0)
      expect(f.expr).not.toBe('')
    }
  })
})

describe('calcFormula', () => {
  it('判别式：a=1,b=5,c=6 → 1', () => {
    expect(calcFormula('quadratic-discriminant', { a: 1, b: 5, c: 6 })).toBe(1)
  })
  it('等差求和：n=10,a1=1,an=10 → 55', () => {
    expect(calcFormula('arithmetic-sum', { n: 10, a1: 1, an: 10 })).toBe(55)
  })
  it('等比求和：a1=1,q=2,n=10 → 1023', () => {
    expect(calcFormula('geometric-sum', { a1: 1, q: 2, n: 10 })).toBe(1023)
  })
  it('等比 q=1 抛中文错误', () => {
    expect(() => calcFormula('geometric-sum', { a1: 1, q: 1, n: 3 })).toThrow('公比 q 不能为 1')
  })
  it('复利：P=1000,r=0.05,n=10 → 约 1628.89', () => {
    expect(calcFormula('compound-interest', { P: 1000, r: 0.05, n: 10 })).toBeCloseTo(1628.89, 2)
  })
  it('勾股：3,4 → 5', () => {
    expect(calcFormula('pythagorean', { a: 3, b: 4 })).toBe(5)
  })
  it('圆面积：r=1 → π', () => {
    expect(calcFormula('circle-area', { r: 1 })).toBeCloseTo(Math.PI, 10)
  })
  it('半径为负抛中文错误', () => {
    expect(() => calcFormula('circle-area', { r: -1 })).toThrow('半径 r不能为负数')
  })
  it('球体积：r=3 → 36π', () => {
    expect(calcFormula('sphere-volume', { r: 3 })).toBeCloseTo(36 * Math.PI, 8)
  })
  it('圆柱体积：r=2,h=5 → 20π', () => {
    expect(calcFormula('cylinder-volume', { r: 2, h: 5 })).toBeCloseTo(20 * Math.PI, 8)
  })
  it('圆锥体积：r=3,h=4 → 12π', () => {
    expect(calcFormula('cone-volume', { r: 3, h: 4 })).toBeCloseTo(12 * Math.PI, 8)
  })
  it('三角形面积：b=4,h=3 → 6', () => {
    expect(calcFormula('triangle-area', { b: 4, h: 3 })).toBe(6)
  })
  it('梯形面积：a=2,b=4,h=3 → 9', () => {
    expect(calcFormula('trapezoid-area', { a: 2, b: 4, h: 3 })).toBe(9)
  })
  it('海伦公式：3,4,5 → 6', () => {
    expect(calcFormula('heron', { a: 3, b: 4, c: 5 })).toBe(6)
  })
  it('海伦：边长为 0 抛中文错误', () => {
    expect(() => calcFormula('heron', { a: 0, b: 4, c: 5 })).toThrow('边长必须为正数')
  })
  it('海伦：不满足三角形不等式抛中文错误', () => {
    expect(() => calcFormula('heron', { a: 1, b: 2, c: 10 })).toThrow('不满足三角形不等式')
  })
  it('两点距离：(0,0)-(3,4) → 5', () => {
    expect(calcFormula('distance-2d', { x1: 0, y1: 0, x2: 3, y2: 4 })).toBe(5)
  })
  it('斜率：(0,0)-(2,4) → 2', () => {
    expect(calcFormula('slope', { x1: 0, y1: 0, x2: 2, y2: 4 })).toBe(2)
  })
  it('垂直直线斜率不存在抛中文错误', () => {
    expect(() => calcFormula('slope', { x1: 1, y1: 0, x2: 1, y2: 5 })).toThrow('斜率不存在')
  })
  it('缺变量抛中文错误', () => {
    expect(() => calcFormula('pythagorean', { a: 3 })).toThrow('缺少变量')
  })
  it('NaN 变量视为缺失', () => {
    expect(() => calcFormula('pythagorean', { a: NaN, b: 4 })).toThrow('缺少变量')
  })
  it('未知公式抛中文错误', () => {
    expect(() => calcFormula('nope', {})).toThrow('未知公式')
  })
})

describe('getFormula / listFormulas / formulasByCategory', () => {
  it('getFormula 返回公式', () => {
    expect(getFormula('heron').name).toBe('海伦公式')
  })
  it('listFormulas 返回全部', () => {
    expect(listFormulas()).toHaveLength(14)
  })
  it('按分类筛选', () => {
    expect(formulasByCategory('代数').length).toBe(4)
    expect(formulasByCategory('几何').length).toBe(9)
    expect(formulasByCategory('三角').length).toBe(1)
    expect(formulasByCategory('代数').every((f) => f.category === '代数')).toBe(true)
  })
})

describe('parseVars', () => {
  it('解析空格分隔的赋值', () => {
    expect(parseVars('a=3 b=4.5')).toEqual({ a: 3, b: 4.5 })
  })
  it('支持逗号与分号分隔', () => {
    expect(parseVars('x1=0,y1=0;x2=3,y2=4')).toEqual({ x1: 0, y1: 0, x2: 3, y2: 4 })
  })
  it('空文本返回空对象', () => {
    expect(parseVars('')).toEqual({})
    expect(parseVars('   ')).toEqual({})
  })
  it('前导分隔符被跳过', () => {
    expect(parseVars(',a=1')).toEqual({ a: 1 })
  })
  it('缺少 = 抛中文错误', () => {
    expect(() => parseVars('a3')).toThrow('key=value')
  })
  it('空键抛中文错误', () => {
    expect(() => parseVars('=3')).toThrow('key=value')
  })
  it('空值抛中文错误', () => {
    expect(() => parseVars('a=')).toThrow('key=value')
  })
  it('非数字值抛中文错误', () => {
    expect(() => parseVars('a=xyz')).toThrow('不是数字')
  })
})
