import { describe, expect, it } from 'vitest'
import { parseAngle, transform } from './utils'

const deg = { unit: 'deg' } as const
const rad = { unit: 'rad' } as const

describe('trigonometry / 30°', () => {
  it('sin30°=0.5, cos30°=√3/2, tan30°=1/√3', () => {
    const out = transform({ text: '30' }, deg)
    expect(out).toContain('sin = 0.5')
    expect(out).toContain('cos = 0.866025403784')
    expect(out).toContain('tan = 0.57735026919')
  })

  it('sec/csc/cot 为倒数', () => {
    const out = transform({ text: '30' }, deg)
    expect(out).toContain('csc = 2')
    expect(out).toContain('sec = 1.15470053838')
    expect(out).toContain('cot = 1.73205080757')
  })
})

describe('trigonometry / 特殊角与无定义', () => {
  it('90° 时 tan/sec 无定义', () => {
    const out = transform({ text: '90' }, deg)
    expect(out).toContain('tan = 无定义')
    expect(out).toContain('sec = 无定义')
    expect(out).toContain('sin = 1')
  })

  it('0° 时 cot/csc 无定义', () => {
    const out = transform({ text: '0' }, deg)
    expect(out).toContain('cot = 无定义')
    expect(out).toContain('csc = 无定义')
    expect(out).toContain('cos = 1')
  })

  it('180° 的 sin 被压平为 0（非 1.2e-16）', () => {
    const out = transform({ text: '180' }, deg)
    expect(out).toContain('sin = 0')
  })

  it('弧度模式：π/6 与 30° 结果一致', () => {
    const out = transform({ text: String(Math.PI / 6) }, rad)
    expect(out).toContain('sin = 0.5')
  })

  it('负角度', () => {
    const out = transform({ text: '-30' }, deg)
    expect(out).toContain('sin = -0.5')
  })
})

describe('trigonometry / 输入校验', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, deg)).toBe('')
  })

  it('非数字报错', () => {
    expect(() => parseAngle('abc')).toThrow(/数字角度/)
    expect(() => transform({ text: 'abc' }, deg)).toThrow(/数字角度/)
  })
})
