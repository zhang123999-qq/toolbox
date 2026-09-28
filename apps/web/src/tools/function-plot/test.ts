/**
 * function-plot（#826）utils 单测：表达式解析、采样、画布映射。
 */
import { describe, expect, it } from 'vitest'
import {
  ALLOWED_FUNCS,
  mapToCanvas,
  parseFunctionExpr,
  sampleFunction,
  tokenize,
} from './utils'

describe('tokenize', () => {
  it('分词 x^2+2*x', () => {
    const types = tokenize('x^2+2*x').map((t) => t.type)
    expect(types).toEqual(['var', 'op', 'num', 'op', 'num', 'op', 'var'])
  })
  it('空表达式抛中文错误', () => {
    expect(() => tokenize('')).toThrow('表达式不能为空')
    expect(() => tokenize('   ')).toThrow('表达式不能为空')
  })
  it('单独的小数点无法解析数字', () => {
    expect(() => tokenize('.')).toThrow('无法解析数字')
  })
  it('不支持的标识符抛中文错误', () => {
    expect(() => tokenize('y+1')).toThrow('不支持的标识符：y')
  })
  it('非法字符抛中文错误', () => {
    expect(() => tokenize('x@2')).toThrow('无法解析的字符')
  })
  it('识别一元减号的各种位置', () => {
    expect(tokenize('-x')[0]).toEqual({ type: 'neg' })
    expect(tokenize('2*-3')[2]).toEqual({ type: 'neg' })
    expect(tokenize('(-3)')[1]).toEqual({ type: 'neg' })
    expect(tokenize('--3')[1]).toEqual({ type: 'neg' })
    expect(tokenize('sin-3')[1]).toEqual({ type: 'neg' })
  })
  it('二元减号识别为运算符', () => {
    expect(tokenize('3-2')[1]).toEqual({ type: 'op', op: '-' })
  })
  it('一元加号被跳过', () => {
    expect(tokenize('+x').map((t) => t.type)).toEqual(['var'])
  })
})

describe('parseFunctionExpr', () => {
  it('x^2 在 x=3 时为 9', () => {
    expect(parseFunctionExpr('x^2')(3)).toBe(9)
  })
  it('2*x+1 在 x=5 时为 11', () => {
    expect(parseFunctionExpr('2*x+1')(5)).toBe(11)
  })
  it('-x^2 在 x=3 时为 -9（幂优先）', () => {
    expect(parseFunctionExpr('-x^2')(3)).toBe(-9)
  })
  it('2^-3 = 0.125', () => {
    expect(parseFunctionExpr('2^-3')(0)).toBe(0.125)
  })
  it('2^3^2 右结合 = 512', () => {
    expect(parseFunctionExpr('2^3^2')(0)).toBe(512)
  })
  it('函数调用：sin/cos/tan/sqrt/log/ln/exp/abs', () => {
    expect(parseFunctionExpr('sin(x)')(0)).toBe(0)
    expect(parseFunctionExpr('cos(x)')(0)).toBe(1)
    expect(parseFunctionExpr('tan(x)')(0)).toBe(0)
    expect(parseFunctionExpr('sqrt(4)')(0)).toBe(2)
    expect(parseFunctionExpr('log(100)')(0)).toBe(2)
    expect(parseFunctionExpr('ln(e)'.replace('e', String(Math.E)))(0)).toBeCloseTo(1, 10)
    expect(parseFunctionExpr('exp(0)')(0)).toBe(1)
    expect(parseFunctionExpr('abs(-3)')(0)).toBe(3)
  })
  it('函数后直接跟变量：sin x+1 在 0 处为 1', () => {
    expect(parseFunctionExpr('sin x+1')(0)).toBe(1)
  })
  it('函数参数的一元负号：sin -3+1 = sin(-3)+1', () => {
    expect(parseFunctionExpr('sin -3+1')(0)).toBeCloseTo(Math.sin(-3) + 1, 10)
  })
  it('函数前的一元负号只作用于函数：-sin(x)+1 在 0 处为 1', () => {
    expect(parseFunctionExpr('-sin(x)+1')(0)).toBe(1)
  })
  it('乘法后的负数：2*-3+1 = -5', () => {
    expect(parseFunctionExpr('2*-3+1')(0)).toBe(-5)
  })
  it('一元负号优先级低于幂：3*-2^2 = -12', () => {
    expect(parseFunctionExpr('3*-2^2')(0)).toBe(-12)
  })
  it('裸括号：(2+3)*4 = 20', () => {
    expect(parseFunctionExpr('(2+3)*4')(0)).toBe(20)
  })
  it('括号前的一元负号：-(2+3) = -5', () => {
    expect(parseFunctionExpr('-(2+3)')(0)).toBe(-5)
  })
  it('减法与除法：5-8 = -3，7/2 = 3.5', () => {
    expect(parseFunctionExpr('5-8')(0)).toBe(-3)
    expect(parseFunctionExpr('7/2')(0)).toBe(3.5)
  })
  it('一元函数前置：sin-3', () => {
    expect(parseFunctionExpr('sin-3')(0)).toBeCloseTo(Math.sin(-3), 10)
  })
  it('双重否定：--3 = 3', () => {
    expect(parseFunctionExpr('--3')(0)).toBe(3)
  })
  it('一元加号：+x', () => {
    expect(parseFunctionExpr('+x')(2)).toBe(2)
  })
  it('多余右括号抛括号不匹配', () => {
    expect(() => parseFunctionExpr('sin(x))')).toThrow('括号不匹配')
  })
  it('缺少右括号抛括号不匹配', () => {
    expect(() => parseFunctionExpr('(x+1')).toThrow('括号不匹配')
  })
  it('x+ 缺少操作数抛表达式无效', () => {
    expect(() => parseFunctionExpr('x+')(1)).toThrow('表达式无效')
  })
  it('单独的 sin 缺少参数抛表达式无效', () => {
    expect(() => parseFunctionExpr('sin')(0)).toThrow('表达式无效')
  })
  it('x 2 多余操作数抛表达式无效', () => {
    expect(() => parseFunctionExpr('x 2')(1)).toThrow('表达式无效')
  })
})

describe('sampleFunction', () => {
  it('[0,2] 采样 3 个点', () => {
    const pts = sampleFunction((x) => x * x, 0, 2, 3)
    expect(pts).toEqual([
      { x: 0, y: 0 },
      { x: 1, y: 1 },
      { x: 2, y: 4 },
    ])
  })
  it('采样点数 <2 抛中文错误', () => {
    expect(() => sampleFunction((x) => x, 0, 1, 1)).toThrow('≥2 的整数')
  })
  it('非整数点数抛中文错误', () => {
    expect(() => sampleFunction((x) => x, 0, 1, 2.5)).toThrow('≥2 的整数')
  })
  it('min>=max 抛中文错误', () => {
    expect(() => sampleFunction((x) => x, 1, 1, 3)).toThrow('最小值必须小于最大值')
    expect(() => sampleFunction((x) => x, 2, 1, 3)).toThrow('最小值必须小于最大值')
  })
})

describe('mapToCanvas', () => {
  it('基本映射：y 轴翻转', () => {
    const m = mapToCanvas(
      [
        { x: 0, y: 0 },
        { x: 10, y: 10 },
      ],
      100,
      100,
      0,
    )
    expect(m.points[0]).toEqual({ cx: 0, cy: 100 })
    expect(m.points[1]).toEqual({ cx: 100, cy: 0 })
    expect(m.xMin).toBe(0)
    expect(m.yMax).toBe(10)
  })
  it('空点集抛中文错误', () => {
    expect(() => mapToCanvas([], 100, 100)).toThrow('没有可绘制的点')
  })
  it('非正画布尺寸抛中文错误', () => {
    const pts = [{ x: 0, y: 0 }]
    expect(() => mapToCanvas(pts, 0, 100)).toThrow('画布尺寸必须为正数')
    expect(() => mapToCanvas(pts, 100, -1)).toThrow('画布尺寸必须为正数')
  })
  it('全为非有限点抛中文错误', () => {
    expect(() => mapToCanvas([{ x: 0, y: NaN }], 100, 100)).toThrow(
      '没有可绘制的有限点',
    )
  })
  it('x 范围退化时自动扩展', () => {
    const m = mapToCanvas(
      [
        { x: 1, y: 1 },
        { x: 1, y: 2 },
      ],
      100,
      100,
      0,
    )
    expect(m.xMax - m.xMin).toBe(2)
  })
  it('y 范围退化时自动扩展', () => {
    const m = mapToCanvas(
      [
        { x: 0, y: 5 },
        { x: 1, y: 5 },
      ],
      100,
      100,
      0,
    )
    expect(m.yMax - m.yMin).toBe(2)
  })
  it('非有限 y 映射为 cy=NaN', () => {
    const pts = sampleFunction((x) => 1 / x, -1, 1, 3)
    const m = mapToCanvas(pts, 100, 100, 0)
    expect(Number.isNaN(m.points[1].cy)).toBe(true)
    expect(Number.isFinite(m.points[0].cy)).toBe(true)
  })
})

describe('ALLOWED_FUNCS', () => {
  it('包含 8 个允许的函数', () => {
    expect(Object.keys(ALLOWED_FUNCS)).toHaveLength(8)
  })
})
