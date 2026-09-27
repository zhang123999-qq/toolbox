import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const linear = { mode: 'linear' } as const
const quadratic = { mode: 'quadratic' } as const
const system = { mode: 'system' } as const

describe('equation / 一元一次', () => {
  it('2x+3=0 → x=-1.5', () => {
    const out = transform({ text: '2x+3=0' }, linear)
    expect(out).toContain('解：x = -1.5')
  })

  it('省略系数：x-4=0 → x=4', () => {
    const out = transform({ text: 'x-4=0' }, linear)
    expect(out).toContain('解：x = 4')
  })

  it('等号右边非零：2x=8 → x=4', () => {
    const out = transform({ text: '2x=8' }, linear)
    expect(out).toContain('解：x = 4')
  })

  it('负系数：-x-5=0 → x=-5', () => {
    const out = transform({ text: '-x-5=0' }, linear)
    expect(out).toContain('解：x = -5')
  })

  it('小数系数', () => {
    const out = transform({ text: '2.5x+1.25=0' }, linear)
    expect(out).toContain('解：x = -0.5')
  })

  it('矛盾方程无解', () => {
    expect(() => transform({ text: '0x+5=0' }, linear)).toThrow(/无解/)
  })
})

describe('equation / 一元二次', () => {
  it('x^2-5x+6=0 → x₁=2, x₂=3', () => {
    const out = transform({ text: 'x^2-5x+6=0' }, quadratic)
    expect(out).toContain('Δ = 1')
    expect(out).toContain('x₁ = 2')
    expect(out).toContain('x₂ = 3')
  })

  it('重根：x^2-4x+4=0 → x=2', () => {
    const out = transform({ text: 'x^2-4x+4=0' }, quadratic)
    expect(out).toContain('重根')
    expect(out).toContain('x = 2')
  })

  it('Δ<0 给出复数解', () => {
    const out = transform({ text: 'x^2+x+1=0' }, quadratic)
    expect(out).toContain('无实数解')
    expect(out).toContain('i')
  })

  it('a=0 时退化为一元一次', () => {
    const out = transform({ text: '0x^2+2x-8=0' }, quadratic)
    expect(out).toContain('解：x = 4')
  })
})

describe('equation / 二元一次方程组', () => {
  it('2x+3y=5 / x-y=1 → x=1.6, y=0.6', () => {
    const out = transform({ text: '2x+3y=5\nx-y=1' }, system)
    expect(out).toContain('解：x = 1.6，y = 0.6')
  })

  it('平行直线无唯一解报错', () => {
    expect(() => transform({ text: 'x+2y=3\n2x+4y=8' }, system)).toThrow(/无唯一解/)
  })

  it('不是两行报错', () => {
    expect(() => transform({ text: '2x+3y=5' }, system)).toThrow(/两行/)
  })
})

describe('equation / 格式错误', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, linear)).toBe('')
  })

  it('缺少等号报错', () => {
    expect(() => transform({ text: '2x+3' }, linear)).toThrow(/等号/)
  })

  it('无法解析的项报错', () => {
    expect(() => transform({ text: '2xy+3=0' }, linear)).toThrow(/无法解析的项/)
  })

  it('一元一次模式遇到二次项报错', () => {
    expect(() => transform({ text: 'x^2+1=0' }, linear)).toThrow(/一元一次/)
  })
})
