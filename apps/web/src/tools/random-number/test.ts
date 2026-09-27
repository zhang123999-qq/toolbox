import { describe, expect, it } from 'vitest'
import { generate, hashSeed, mulberry32, parseParams, transform } from './utils'

const noOptions = { unique: false }

describe('random-number / utils', () => {
  it('全部留空 → 空串（不进入错误态）', () => {
    expect(transform({ text: '', min: '', max: '', decimals: '' }, noOptions)).toBe('')
  })

  it('默认范围 1–100、默认 10 个整数', () => {
    const numbers = generate({ text: '', min: '', max: '', decimals: '' }, noOptions, 1)
    expect(numbers).toHaveLength(10)
    for (const n of numbers) {
      expect(Number.isInteger(n)).toBe(true)
      expect(n).toBeGreaterThanOrEqual(1)
      expect(n).toBeLessThanOrEqual(100)
    }
  })

  it('相同 salt 结果稳定（显示 / 复制 / 下载一致）', () => {
    const input = { text: '5', min: '1', max: '10', decimals: '0' }
    expect(generate(input, noOptions, 42)).toEqual(generate(input, noOptions, 42))
    expect(generate(input, noOptions, 42)).not.toEqual(generate(input, noOptions, 43))
  })

  it('小数模式：保留指定位数且在范围内', () => {
    const numbers = generate({ text: '20', min: '0', max: '1', decimals: '2' }, noOptions, 7)
    expect(numbers).toHaveLength(20)
    for (const n of numbers) {
      expect(n).toBeGreaterThanOrEqual(0)
      expect(n).toBeLessThanOrEqual(1)
      expect(String(n).split('.')[1]?.length ?? 0).toBeLessThanOrEqual(2)
    }
  })

  it('不重复抽取：个数正确且互不相同', () => {
    const numbers = generate({ text: '5', min: '1', max: '10', decimals: '0' }, { unique: true }, 3)
    expect(numbers).toHaveLength(5)
    expect(new Set(numbers).size).toBe(5)
  })

  it('min > max 抛中文错', () => {
    expect(() => parseParams({ text: '5', min: '10', max: '1', decimals: '0' }, noOptions)).toThrow(
      /最小值.*不能大于最大值/,
    )
  })

  it('非法数量 / 小数位数抛中文错', () => {
    expect(() => parseParams({ text: 'abc', min: '', max: '', decimals: '' }, noOptions)).toThrow(
      /数量无效/,
    )
    expect(() => parseParams({ text: '5', min: '', max: '', decimals: 'x' }, noOptions)).toThrow(
      /小数位数无效/,
    )
  })

  it('数量超过上限抛错', () => {
    expect(() => parseParams({ text: '10001', min: '', max: '', decimals: '' }, noOptions)).toThrow(
      /上限/,
    )
  })

  it('不重复数量超过范围容量抛错', () => {
    expect(() =>
      parseParams({ text: '11', min: '1', max: '10', decimals: '0' }, { unique: true }),
    ).toThrow(/超过范围可提供的个数/)
  })

  it('小数模式下勾选不重复抛错', () => {
    expect(() =>
      parseParams({ text: '5', min: '1', max: '10', decimals: '2' }, { unique: true }),
    ).toThrow(/仅支持整数/)
  })

  it('PRNG 基础函数可用', () => {
    expect(hashSeed('a')).toBe(hashSeed('a'))
    const rand = mulberry32(123)
    const v = rand()
    expect(v).toBeGreaterThanOrEqual(0)
    expect(v).toBeLessThan(1)
  })

  it('transform 输出为换行分隔的数字', () => {
    const out = transform({ text: '3', min: '1', max: '100', decimals: '0' }, noOptions, 9)
    expect(out.split('\n')).toHaveLength(3)
  })
})
