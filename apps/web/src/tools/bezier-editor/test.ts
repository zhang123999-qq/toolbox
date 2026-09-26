import { describe, expect, it } from 'vitest'
import { bezierPoint, buildBezier, parseControl, transform } from './utils'
import type { BezierEditorOptions } from './schema'

const base: BezierEditorOptions = { x1: '0.25', y1: '0.1', x2: '0.25', y2: '1' }

describe('bezier-editor / parseControl', () => {
  it('x 限定 [0,1]，y 允许 [-1,2]', () => {
    expect(parseControl('0.5', 'x1', [0, 1])).toBe(0.5)
    expect(parseControl('1.5', 'y1', [-1, 2])).toBe(1.5)
    expect(() => parseControl('1.5', 'x1', [0, 1])).toThrow(/x1 超出范围/)
    expect(() => parseControl('abc', 'x1', [0, 1])).toThrow(/x1 格式非法/)
  })
})

describe('bezier-editor / bezierPoint', () => {
  it('端点 t=0 → (0,0)，t=1 → (1,1)', () => {
    expect(bezierPoint(0, 0.25, 0.1, 0.25, 1)).toEqual({ x: 0, y: 0 })
    expect(bezierPoint(1, 0.25, 0.1, 0.25, 1)).toEqual({ x: 1, y: 1 })
  })

  it('中点数值符合三次贝塞尔公式', () => {
    const p = bezierPoint(0.5, 0.25, 0.1, 0.25, 1)
    // x = 0.375*0.25 + 0.375*0.25 + 0.125 = 0.3125
    expect(p.x).toBeCloseTo(0.3125, 5)
    // y = 0.375*0.1 + 0.375*1 + 0.125 = 0.5375
    expect(p.y).toBeCloseTo(0.5375, 5)
  })
})

describe('bezier-editor / buildBezier', () => {
  it('输出 cubic-bezier 与采样点', () => {
    const out = buildBezier(base)
    expect(out.startsWith('cubic-bezier(0.25, 0.1, 0.25, 1)')).toBe(true)
    expect(out).toContain('t=0.50 →')
  })

  it('x 越界抛错', () => {
    expect(() => buildBezier({ ...base, x1: '2' })).toThrow(/x1 超出范围/)
  })
})

describe('bezier-editor / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 cubic-bezier', () => {
    expect(transform({ text: 'go' }, base)).toContain('cubic-bezier(')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
