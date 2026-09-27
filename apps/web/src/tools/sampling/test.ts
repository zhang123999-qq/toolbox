import { describe, expect, it } from 'vitest'
import { createTranslator } from '../../i18n'
import {
  bilingualError,
  buildRandom,
  computeSample,
  hashSeed,
  mulberry32,
  parsePopulation,
  parseSampleSize,
  samplePopulation,
  transform,
} from './utils'

const t = createTranslator('zh')
const emptyOptions = { replace: false }
const withReplace = { replace: true }

describe('sampling / bilingualError', () => {
  it('错误信息中英双语，均来自 i18n 词典', () => {
    const error = bilingualError('sampling.error.sizeNegative')
    expect(error.message).toContain('样本量不能为负数')
    expect(error.message).toContain('Sample size cannot be negative')
  })

  it('占位符插值：中英两侧同时替换', () => {
    const error = bilingualError('sampling.error.sizeTooLarge', { max: 100000 })
    expect(error.message).toContain('上限为 100000')
    expect(error.message).toContain('(max 100000)')
  })

  it('未提供的占位符原样保留', () => {
    const error = bilingualError('sampling.error.sizeNotNumber', {})
    expect(error.message).toContain('{value}')
  })
})

describe('sampling / mulberry32', () => {
  it('相同种子产生相同序列（可复现）', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    const seqA = [a(), a(), a(), a(), a()]
    const seqB = [b(), b(), b(), b(), b()]
    expect(seqA).toEqual(seqB)
  })

  it('不同种子大概率产生不同序列', () => {
    const a = mulberry32(1)
    const b = mulberry32(2)
    const seqA = [a(), a(), a()]
    const seqB = [b(), b(), b()]
    expect(seqA).not.toEqual(seqB)
  })

  it('输出落在 [0, 1) 区间', () => {
    const rand = mulberry32(7)
    for (let i = 0; i < 1000; i += 1) {
      const v = rand()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })

  it('种子做无符号 32 位归一（负数种子不抛错）', () => {
    const rand = mulberry32(-1)
    expect(rand()).toBeGreaterThanOrEqual(0)
  })
})

describe('sampling / hashSeed', () => {
  it('空字符串返回 FNV 偏移基数', () => {
    expect(hashSeed('')).toBe(2166136261)
  })

  it('相同字符串哈希一致，不同字符串大概率不同', () => {
    expect(hashSeed('seed-42')).toBe(hashSeed('seed-42'))
    expect(hashSeed('seed-42')).not.toBe(hashSeed('seed-43'))
  })
})

describe('sampling / parsePopulation', () => {
  it('按行切分、去空白、丢空行', () => {
    expect(parsePopulation('苹果\n\n  香蕉  \n\r\n橙子\n')).toEqual(['苹果', '香蕉', '橙子'])
  })

  it('空输入得到空数组', () => {
    expect(parsePopulation('')).toEqual([])
    expect(parsePopulation('  \n \n')).toEqual([])
  })

  it('重复元素保留（按位置独立看待）', () => {
    expect(parsePopulation('a\na\nb')).toEqual(['a', 'a', 'b'])
  })
})

describe('sampling / parseSampleSize 边界', () => {
  it('空输入报错', () => {
    expect(() => parseSampleSize('')).toThrow(/请填写样本量/)
    expect(() => parseSampleSize('   ')).toThrow(/Please enter the sample size/)
  })

  it('非数字字符串报错', () => {
    expect(() => parseSampleSize('abc')).toThrow(/样本量无效/)
    expect(() => parseSampleSize('abc')).toThrow(/must be a number/)
  })

  it('NaN 报错', () => {
    expect(() => parseSampleSize('NaN')).toThrow(/样本量无效/)
  })

  it('Infinity 报错', () => {
    expect(() => parseSampleSize('Infinity')).toThrow(/样本量无效/)
    expect(() => parseSampleSize('-Infinity')).toThrow(/样本量无效/)
  })

  it('小数（非整数）报错', () => {
    expect(() => parseSampleSize('3.5')).toThrow(/须为整数/)
    expect(() => parseSampleSize('3.5')).toThrow(/must be an integer/)
  })

  it('负数报错', () => {
    expect(() => parseSampleSize('-2')).toThrow(/不能为负数/)
  })

  it('0 合法（抽 0 个）', () => {
    expect(parseSampleSize('0')).toBe(0)
  })

  it('极大值 1e15 超上限报错', () => {
    expect(() => parseSampleSize('1e15')).toThrow(/样本量过大/)
    expect(() => parseSampleSize('1e15')).toThrow(/too large/)
  })

  it('上限边界：100000 合法，100001 报错', () => {
    expect(parseSampleSize('100000')).toBe(100000)
    expect(() => parseSampleSize('100001')).toThrow(/样本量过大/)
  })

  it('首尾空白自动去除', () => {
    expect(parseSampleSize('  5 ')).toBe(5)
  })
})

describe('sampling / samplePopulation', () => {
  const population = ['a', 'b', 'c', 'd', 'e']

  it('无放回：结果是原总体的子集、无重复、数量正确', () => {
    const picked = samplePopulation(population, 3, false, mulberry32(42))
    expect(picked).toHaveLength(3)
    expect(new Set(picked).size).toBe(3)
    for (const item of picked) expect(population).toContain(item)
  })

  it('无放回 + 相同种子 → 结果一致', () => {
    const first = samplePopulation(population, 3, false, mulberry32(42))
    const second = samplePopulation(population, 3, false, mulberry32(42))
    expect(first).toEqual(second)
  })

  it('无放回 + 不同种子 → 大概率不同', () => {
    const big = Array.from({ length: 30 }, (_, i) => 'item-' + i)
    const first = samplePopulation(big, 10, false, mulberry32(1))
    const second = samplePopulation(big, 10, false, mulberry32(2))
    expect(first).not.toEqual(second)
  })

  it('无放回：样本量 = 总体量时返回全排列', () => {
    const picked = samplePopulation(population, 5, false, mulberry32(9))
    expect(picked).toHaveLength(5)
    expect([...picked].sort()).toEqual([...population].sort())
  })

  it('无放回：样本量 > 总体量时报错（中英双语）', () => {
    expect(() => samplePopulation(population, 6, false, mulberry32(1))).toThrow(/不能大于总体规模/)
    expect(() => samplePopulation(population, 6, false, mulberry32(1))).toThrow(
      /cannot exceed population size/,
    )
  })

  it('有放回：可重复抽取同一元素', () => {
    // 总体只有一个元素时，有放回抽 3 个必然全是它
    expect(samplePopulation(['only'], 3, true, mulberry32(5))).toEqual(['only', 'only', 'only'])
  })

  it('有放回：样本量可大于总体量', () => {
    const picked = samplePopulation(population, 8, true, mulberry32(3))
    expect(picked).toHaveLength(8)
    for (const item of picked) expect(population).toContain(item)
  })

  it('有放回：样本量 = 0 返回空数组', () => {
    expect(samplePopulation(population, 0, true, mulberry32(1))).toEqual([])
  })

  it('无放回：样本量 = 0 返回空数组', () => {
    expect(samplePopulation(population, 0, false, mulberry32(1))).toEqual([])
  })

  it('单元素总体：无放回抽 1 个', () => {
    expect(samplePopulation(['only'], 1, false, mulberry32(1))).toEqual(['only'])
  })

  it('总体含重复元素：按位置独立抽样', () => {
    const picked = samplePopulation(['x', 'x', 'y'], 2, false, mulberry32(11))
    expect(picked).toHaveLength(2)
  })
})

describe('sampling / buildRandom', () => {
  it('种子为空返回 Math.random', () => {
    expect(buildRandom('')).toBe(Math.random)
    expect(buildRandom('   ')).toBe(Math.random)
  })

  it('有种子返回可复现的 PRNG', () => {
    const a = buildRandom('hello')
    const b = buildRandom('hello')
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })
})

describe('sampling / computeSample', () => {
  it('总体留空返回 null（空态，不报错）', () => {
    expect(computeSample({ text: '', sampleSize: '3', seed: '' }, emptyOptions)).toBeNull()
    expect(computeSample({ text: ' \n ', sampleSize: '3', seed: '' }, emptyOptions)).toBeNull()
  })

  it('正常抽样返回结果对象', () => {
    const result = computeSample(
      { text: 'a\nb\nc\nd\ne', sampleSize: '2', seed: 's1' },
      emptyOptions,
    )
    expect(result).not.toBeNull()
    expect(result!.populationSize).toBe(5)
    expect(result!.size).toBe(2)
    expect(result!.withReplacement).toBe(false)
    expect(result!.seedText).toBe('s1')
    expect(result!.items).toHaveLength(2)
  })

  it('样本量非法时抛错', () => {
    expect(() =>
      computeSample({ text: 'a\nb', sampleSize: 'abc', seed: '' }, emptyOptions),
    ).toThrow(/样本量无效/)
  })

  it('无放回且样本量超总体时抛错', () => {
    expect(() => computeSample({ text: 'a\nb', sampleSize: '3', seed: '' }, emptyOptions)).toThrow(
      /不能大于总体规模/,
    )
  })

  it('有放回时样本量可超总体', () => {
    const result = computeSample({ text: 'a\nb', sampleSize: '5', seed: 'k' }, withReplace)
    expect(result!.items).toHaveLength(5)
    expect(result!.withReplacement).toBe(true)
  })
})

describe('sampling / transform', () => {
  it('空总体返回空串', () => {
    expect(transform({ text: '', sampleSize: '3', seed: '' }, emptyOptions, t)).toBe('')
  })

  it('输出含抽样方式 / 规模 / 种子 / 结果行', () => {
    const out = transform(
      { text: '苹果\n香蕉\n橙子\n葡萄\n西瓜', sampleSize: '3', seed: '42' },
      emptyOptions,
      t,
    )
    expect(out).toContain('抽样方式：无放回')
    expect(out).toContain('总体规模：5')
    expect(out).toContain('样本量：3')
    expect(out).toContain('种子：42')
    expect(out).toContain('抽样结果：')
    const itemLines = out.split('\n').filter((line) => /^\d+\. /.test(line))
    expect(itemLines).toHaveLength(3)
  })

  it('无种子时标注真随机', () => {
    const out = transform({ text: 'a\nb\nc', sampleSize: '1', seed: '' }, emptyOptions, t)
    expect(out).toContain('种子：真随机')
  })

  it('有放回模式输出标注有放回', () => {
    const out = transform({ text: 'a\nb', sampleSize: '4', seed: 'z' }, withReplace, t)
    expect(out).toContain('抽样方式：有放回')
  })

  it('样本量 = 0 时结果区为空（不报错）', () => {
    const out = transform({ text: 'a\nb\nc', sampleSize: '0', seed: '1' }, emptyOptions, t)
    expect(out).toContain('样本量：0')
    expect(out.split('\n').filter((line) => /^\d+\. /.test(line))).toHaveLength(0)
  })

  it('非法样本量进入错误态（抛双语错误）', () => {
    expect(() => transform({ text: 'a\nb', sampleSize: '-1', seed: '' }, emptyOptions, t)).toThrow(
      /样本量不能为负数/,
    )
  })
})
