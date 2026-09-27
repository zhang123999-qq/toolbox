import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  flip,
  flipCoins,
  hashSeed,
  mulberry32,
  parseFlipCount,
  tallySides,
  transform,
} from './utils'

const t = createTranslator('zh')
const emptyOptions = {}

describe('coin / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('coin.error.countEmpty')
    expect(error.message).toContain('请填写抛掷次数')
    expect(error.message).toContain('Enter the flip count')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('coin.error.countTooLarge', { max: 10000 })
    expect(error.message).toContain('上限 10000')
    expect(error.message).toContain('max 10000')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('coin.error.countInvalid', {})
    expect(error.message).toContain('{value}')
  })

  it('hashSeed 空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('hashSeed 非空字符串：循环体执行，相同输入哈希一致', () => {
    expect(hashSeed('seed-42')).toBe(hashSeed('seed-42'))
    expect(hashSeed('seed-42')).not.toBe(hashSeed(''))
  })
})

describe('coin / parseFlipCount 边界', () => {
  it('空输入报错', () => {
    expect(() => parseFlipCount('')).toThrow(/请填写抛掷次数/)
    expect(() => parseFlipCount('   ')).toThrow(/Enter the flip count/)
  })

  it('非整数 / 0 / 负数报错', () => {
    expect(() => parseFlipCount('abc')).toThrow(/抛掷次数无效/)
    expect(() => parseFlipCount('2.5')).toThrow(/须为 1–10000 的整数/)
    expect(() => parseFlipCount('0')).toThrow(/抛掷次数无效/)
    expect(() => parseFlipCount('-1')).toThrow(/抛掷次数无效/)
    expect(() => parseFlipCount('NaN')).toThrow(/抛掷次数无效/)
  })

  it('超上限报错', () => {
    expect(parseFlipCount('10000')).toBe(10000)
    expect(() => parseFlipCount('10001')).toThrow(/抛掷次数过大/)
  })

  it('首尾空白自动去除', () => {
    expect(parseFlipCount('  5 ')).toBe(5)
  })
})

describe('coin / flipCoins', () => {
  it('只产出正面 / 反面', () => {
    const sides = flipCoins(200, mulberry32(21))
    expect(sides).toHaveLength(200)
    for (const side of sides) expect(['heads', 'tails']).toContain(side)
  })

  it('相同随机源 → 相同序列（确定性）', () => {
    expect(flipCoins(10, mulberry32(42))).toEqual(flipCoins(10, mulberry32(42)))
  })

  it('随机源恒 < 0.5 → 全正面；恒 ≥ 0.5 → 全反面（无偏分界）', () => {
    expect(flipCoins(5, () => 0.1)).toEqual(['heads', 'heads', 'heads', 'heads', 'heads'])
    expect(flipCoins(5, () => 0.9)).toEqual(['tails', 'tails', 'tails', 'tails', 'tails'])
  })

  it('次数 = 0 返回空数组', () => {
    expect(flipCoins(0, mulberry32(1))).toEqual([])
  })

  it('大量抛掷（10000 次）性能：可接受', () => {
    const start = Date.now()
    const sides = flipCoins(10000, mulberry32(1))
    expect(sides).toHaveLength(10000)
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('coin / tallySides & flip', () => {
  it('统计正反面次数', () => {
    expect(tallySides(['heads', 'tails', 'heads'])).toEqual({ heads: 2, tails: 1 })
  })

  it('空序列统计为 0', () => {
    expect(tallySides([])).toEqual({ heads: 0, tails: 0 })
  })

  it('正常抛掷返回结果对象', () => {
    const outcome = flip({ text: '10' }, emptyOptions, mulberry32(6))
    expect(outcome.count).toBe(10)
    expect(outcome.sides).toHaveLength(10)
    expect(outcome.tally.heads + outcome.tally.tails).toBe(10)
  })

  it('次数非法时抛错', () => {
    expect(() => flip({ text: '0' }, emptyOptions, mulberry32(1))).toThrow(/抛掷次数无效/)
  })
})

describe('coin / transform', () => {
  it('输出含次数 / 结果序列 / 正反面统计', () => {
    const out = transform({ text: '3' }, emptyOptions, mulberry32(9), t)
    expect(out).toContain('抛掷次数：3')
    expect(out).toContain('抛掷结果：')
    expect(out).toMatch(/正面 \d+ 次，反面 \d+ 次/)
  })

  it('非法次数进入错误态（抛双语错误）', () => {
    expect(() => transform({ text: '' }, emptyOptions, mulberry32(1), t)).toThrow(/请填写抛掷次数/)
  })
})
