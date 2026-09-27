import { describe, expect, it } from 'vitest'
import { fmt, parseParams, transform } from './utils'

const circle = { shape: 'circle' } as const
const rectangle = { shape: 'rectangle' } as const
const triangle = { shape: 'triangle' } as const
const sphere = { shape: 'sphere' } as const
const cone = { shape: 'cone' } as const

describe('geometry / parseParams', () => {
  it('key=value 写法', () => {
    expect(parseParams('r=5', 'circle')).toEqual({ r: 5 })
  })

  it('裸数字按顺序填充', () => {
    expect(parseParams('3\n4', 'rectangle')).toEqual({ a: 3, b: 4 })
  })

  it('中文别名', () => {
    expect(parseParams('半径=2', 'circle')).toEqual({ r: 2 })
  })

  it('缺少参数报错', () => {
    expect(() => parseParams('a=3', 'rectangle')).toThrow(/缺少参数/)
  })

  it('非正数报错', () => {
    expect(() => parseParams('r=-5', 'circle')).toThrow(/正数/)
    expect(() => parseParams('r=0', 'circle')).toThrow(/正数/)
  })

  it('未知参数名报错', () => {
    expect(() => parseParams('x=5', 'circle')).toThrow(/未知参数名/)
  })
})

describe('geometry / 计算', () => {
  it('圆 r=5：周长 10π，面积 25π', () => {
    const out = transform({ text: 'r=5' }, circle)
    expect(out).toContain('周长：31.41592654')
    expect(out).toContain('面积：78.53981634')
    expect(out).toContain('直径：10')
  })

  it('矩形 3×4：周长 14，面积 12，对角线 5', () => {
    const out = transform({ text: 'a=3\nb=4' }, rectangle)
    expect(out).toContain('周长：14')
    expect(out).toContain('面积：12')
    expect(out).toContain('对角线：5')
  })

  it('三角形 3-4-5：周长 12，面积 6', () => {
    const out = transform({ text: '3\n4\n5' }, triangle)
    expect(out).toContain('周长：12')
    expect(out).toContain('面积：6')
  })

  it('不满足三角形不等式报错', () => {
    expect(() => transform({ text: '1\n2\n10' }, triangle)).toThrow(/三角形不等式/)
  })

  it('球体 r=3：表面积 36π，体积 36π', () => {
    const out = transform({ text: 'r=3' }, sphere)
    expect(out).toContain('表面积：113.0973355')
    expect(out).toContain('体积：113.0973355')
  })

  it('圆锥 r=3,h=4：母线 5，体积 12π', () => {
    const out = transform({ text: 'r=3\nh=4' }, cone)
    expect(out).toContain('母线：5')
    expect(out).toContain('体积：37.69911184')
  })

  it('输出附公式', () => {
    const out = transform({ text: 'r=5' }, circle)
    expect(out).toContain('周长 = 2πr')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, circle)).toBe('')
  })
})

describe('geometry / fmt', () => {
  it('去尾零', () => {
    expect(fmt(31.41592653589793)).toBe('31.41592654')
    expect(fmt(10)).toBe('10')
    expect(fmt(0.1 + 0.2)).toBe('0.3')
  })
})
