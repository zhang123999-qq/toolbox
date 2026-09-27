import { describe, expect, it } from 'vitest'
import { transform } from './utils'

const log10 = { function: 'log10' } as const
const ln = { function: 'ln' } as const
const log2 = { function: 'log2' } as const
const logbase = { function: 'logbase' } as const
const exp = { function: 'exp' } as const
const pow10 = { function: 'pow10' } as const
const pow2 = { function: 'pow2' } as const

describe('log-exp / 对数', () => {
  it('lg(100) = 2', () => {
    const out = transform({ text: '100', textB: '' }, log10)
    expect(out).toContain('log_10(100) = 2')
  })

  it('ln(e) = 1', () => {
    const out = transform({ text: String(Math.E), textB: '' }, ln)
    expect(out).toContain('= 1')
  })

  it('log₂(8) = 3', () => {
    const out = transform({ text: '8', textB: '' }, log2)
    expect(out).toContain('log_2(8) = 3')
  })

  it('自定义底数：log₃(81) = 4', () => {
    const out = transform({ text: '81', textB: '3' }, logbase)
    expect(out).toContain('log_3(81) = 4')
  })

  it('真数 ≤ 0 报错', () => {
    expect(() => transform({ text: '0', textB: '' }, log10)).toThrow(/真数必须为正数/)
    expect(() => transform({ text: '-5', textB: '' }, ln)).toThrow(/真数必须为正数/)
  })

  it('底数非法报错', () => {
    expect(() => transform({ text: '8', textB: '1' }, logbase)).toThrow(/底数/)
    expect(() => transform({ text: '8', textB: '-2' }, logbase)).toThrow(/底数/)
    expect(() => transform({ text: '8', textB: '' }, logbase)).toThrow(/底数/)
  })
})

describe('log-exp / 指数', () => {
  it('e^0 = 1', () => {
    const out = transform({ text: '0', textB: '' }, exp)
    expect(out).toContain('e^0 = 1')
  })

  it('10^3 = 1000', () => {
    const out = transform({ text: '3', textB: '' }, pow10)
    expect(out).toContain('10^3 = 1000')
  })

  it('2^10 = 1024', () => {
    const out = transform({ text: '10', textB: '' }, pow2)
    expect(out).toContain('2^10 = 1024')
  })

  it('指数可为负数 / 小数', () => {
    const out = transform({ text: '-1', textB: '' }, pow10)
    expect(out).toContain('10^-1 = 0.1')
  })
})

describe('log-exp / 输入校验', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, log10)).toBe('')
  })

  it('非数字报错', () => {
    expect(() => transform({ text: 'abc', textB: '' }, log10)).toThrow(/数字/)
  })
})
