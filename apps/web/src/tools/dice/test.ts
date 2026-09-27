import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  diceTotal,
  hashSeed,
  mulberry32,
  parseDiceCount,
  parseDiceSides,
  roll,
  rollDice,
  transform,
} from './utils'

const t = createTranslator('zh')
const emptyOptions = {}

describe('dice / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('dice.error.countEmpty')
    expect(error.message).toContain('请填写骰子个数')
    expect(error.message).toContain('Enter the dice count')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('dice.error.sidesTooLarge', { max: 100 })
    expect(error.message).toContain('上限 100')
    expect(error.message).toContain('max 100')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('dice.error.countInvalid', {})
    expect(error.message).toContain('{value}')
  })

  it('无参数时模板原样返回', () => {
    const error = bilingualError('dice.error.sidesEmpty')
    expect(error.message).toContain('请填写骰子面数')
  })

  it('hashSeed 空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('hashSeed 非空字符串：循环体执行，相同输入哈希一致', () => {
    expect(hashSeed('seed-42')).toBe(hashSeed('seed-42'))
    expect(hashSeed('seed-42')).not.toBe(hashSeed(''))
  })
})

describe('dice / parseDiceCount 边界', () => {
  it('空输入报错', () => {
    expect(() => parseDiceCount('')).toThrow(/请填写骰子个数/)
    expect(() => parseDiceCount('   ')).toThrow(/Enter the dice count/)
  })

  it('非整数 / 0 / 负数报错', () => {
    expect(() => parseDiceCount('abc')).toThrow(/骰子个数无效/)
    expect(() => parseDiceCount('2.5')).toThrow(/须为 1–100 的整数/)
    expect(() => parseDiceCount('0')).toThrow(/骰子个数无效/)
    expect(() => parseDiceCount('-3')).toThrow(/骰子个数无效/)
    expect(() => parseDiceCount('NaN')).toThrow(/骰子个数无效/)
  })

  it('超上限报错', () => {
    expect(parseDiceCount('100')).toBe(100)
    expect(() => parseDiceCount('101')).toThrow(/骰子个数过大/)
  })

  it('首尾空白自动去除', () => {
    expect(parseDiceCount('  3 ')).toBe(3)
  })
})

describe('dice / parseDiceSides 边界', () => {
  it('空输入报错', () => {
    expect(() => parseDiceSides('')).toThrow(/请填写骰子面数/)
    expect(() => parseDiceSides('   ')).toThrow(/Enter the number of sides/)
  })

  it('非整数 / 小于 2 报错（1 面骰无意义）', () => {
    expect(() => parseDiceSides('abc')).toThrow(/骰子面数无效/)
    expect(() => parseDiceSides('1')).toThrow(/须为 2–100 的整数/)
    expect(() => parseDiceSides('0')).toThrow(/骰子面数无效/)
    expect(() => parseDiceSides('-2')).toThrow(/骰子面数无效/)
    expect(() => parseDiceSides('6.5')).toThrow(/骰子面数无效/)
  })

  it('超上限报错', () => {
    expect(parseDiceSides('100')).toBe(100)
    expect(() => parseDiceSides('101')).toThrow(/骰子面数过大/)
  })

  it('2 面合法（下限边界）', () => {
    expect(parseDiceSides('2')).toBe(2)
  })
})

describe('dice / rollDice', () => {
  it('点数落在 [1, sides] 区间', () => {
    const rolls = rollDice(200, 6, mulberry32(11))
    expect(rolls).toHaveLength(200)
    for (const roll of rolls) {
      expect(roll).toBeGreaterThanOrEqual(1)
      expect(roll).toBeLessThanOrEqual(6)
      expect(Number.isInteger(roll)).toBe(true)
    }
  })

  it('相同随机源 → 相同结果（确定性）', () => {
    expect(rollDice(5, 20, mulberry32(42))).toEqual(rollDice(5, 20, mulberry32(42)))
  })

  it('个数 = 0 返回空数组', () => {
    expect(rollDice(0, 6, mulberry32(1))).toEqual([])
  })

  it('大量骰子（100 个 100 面）性能：可接受', () => {
    const start = Date.now()
    const rolls = rollDice(100, 100, mulberry32(1))
    expect(rolls).toHaveLength(100)
    expect(Date.now() - start).toBeLessThan(2000)
  })
})

describe('dice / diceTotal & roll', () => {
  it('总点数求和', () => {
    expect(diceTotal([3, 5, 6])).toBe(14)
    expect(diceTotal([])).toBe(0)
  })

  it('正常掷骰返回结果对象', () => {
    const outcome = roll({ text: '3', sides: '6' }, emptyOptions, mulberry32(5))
    expect(outcome.count).toBe(3)
    expect(outcome.sides).toBe(6)
    expect(outcome.rolls).toHaveLength(3)
    expect(outcome.total).toBe(diceTotal(outcome.rolls))
  })

  it('个数非法时抛错', () => {
    expect(() => roll({ text: '0', sides: '6' }, emptyOptions, mulberry32(1))).toThrow(
      /骰子个数无效/,
    )
  })

  it('面数非法时抛错', () => {
    expect(() => roll({ text: '2', sides: '1' }, emptyOptions, mulberry32(1))).toThrow(
      /骰子面数无效/,
    )
  })
})

describe('dice / transform', () => {
  it('输出含个数 / 面数 / 结果 / 总点数', () => {
    const out = transform({ text: '2', sides: '6' }, emptyOptions, mulberry32(9), t)
    expect(out).toContain('骰子个数：2，骰子面数：6')
    expect(out).toContain('掷骰结果：')
    expect(out).toMatch(/总点数：\d+/)
  })

  it('非法参数进入错误态（抛双语错误）', () => {
    expect(() => transform({ text: '2', sides: '' }, emptyOptions, mulberry32(1), t)).toThrow(
      /请填写骰子面数/,
    )
  })
})
