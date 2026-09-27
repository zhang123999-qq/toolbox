import { describe, expect, it } from 'vitest'
import {
  gcd,
  gcdAll,
  joinRatio,
  parseRatio,
  simplifyRatio,
  solveProportion,
  splitByRatio,
  transform,
} from './utils'

const SIM = { mode: 'simplify' } as const

describe('ratio / gcd', () => {
  it('最大公约数', () => {
    expect(gcd(12, 18)).toBe(6)
    expect(gcd(0, 5)).toBe(5)
    expect(gcdAll([12, 18, 24])).toBe(6)
  })
})

describe('ratio / parseRatio', () => {
  it('解析冒号分隔', () => {
    expect(parseRatio('12:18')).toEqual([12, 18])
    expect(parseRatio(' 12：18：6 ')).toEqual([12, 18, 6])
  })

  it('少于两项报错', () => {
    expect(() => parseRatio('12')).toThrow(/至少需要两项/)
  })

  it('全 0 报错', () => {
    expect(() => parseRatio('0:0')).toThrow(/不能全为 0/)
  })

  it('非数字报错', () => {
    expect(() => parseRatio('a:b')).toThrow(/不是有效数字/)
  })
})

describe('ratio / simplifyRatio', () => {
  it('12:18 → 2:3', () => {
    expect(simplifyRatio([12, 18])).toEqual([2, 3])
  })

  it('小数比例精确化简：1.5:2.5 → 3:5', () => {
    expect(simplifyRatio([1.5, 2.5])).toEqual([3, 5])
  })

  it('三项：12:18:24 → 2:3:4', () => {
    expect(simplifyRatio([12, 18, 24])).toEqual([2, 3, 4])
  })
})

describe('ratio / solveProportion', () => {
  it('2:3 = 10:x → x=15', () => {
    expect(solveProportion(2, 3, 10)).toBe(15)
  })

  it('a=0 报错', () => {
    expect(() => solveProportion(0, 3, 10)).toThrow(/不能为 0/)
  })
})

describe('ratio / splitByRatio', () => {
  it('1000 按 2:3:5 分配', () => {
    expect(splitByRatio([2, 3, 5], 1000)).toEqual([200, 300, 500])
  })

  it('和为 0 报错', () => {
    expect(() => splitByRatio([0, 0], 100)).toThrow(/不能为 0/)
  })
})

describe('ratio / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '', textB: '' }, SIM)).toBe('')
  })

  it('默认化简模式', () => {
    const out = transform({ text: '12:18', textB: '' }, { mode: 'simplify' })
    expect(out).toContain('12 : 18 = 2 : 3')
  })

  it('解比例方程', () => {
    const out = transform({ text: '2:3', textB: '10' }, { mode: 'solve' })
    expect(out).toContain('x')
    expect(out).toContain('15')
  })

  it('解方程需要恰好两项', () => {
    expect(() => transform({ text: '2:3:4', textB: '10' }, { mode: 'solve' })).toThrow(/恰好两项/)
  })

  it('按比例分配', () => {
    const out = transform({ text: '2:3:5', textB: '1000' }, { mode: 'split' })
    expect(out).toContain('第 1 项：200')
    expect(out).toContain('第 3 项：500')
  })

  it('joinRatio 格式化', () => {
    expect(joinRatio([2, 3])).toBe('2 : 3')
  })
})
