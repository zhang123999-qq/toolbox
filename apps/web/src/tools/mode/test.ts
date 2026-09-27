import { describe, expect, it } from 'vitest'
import { findMode, parseNumbers, transform } from './utils'

const empty = {}

describe('mode / parseNumbers', () => {
  it('多种分隔符混用', () => {
    expect(parseNumbers('1, 2 3\n4，5、6;7|8')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
  })

  it('支持小数与负数', () => {
    expect(parseNumbers('-1.5, 2.25')).toEqual([-1.5, 2.25])
  })

  it('非数字 token 报错并指出内容', () => {
    expect(() => parseNumbers('1, abc, 3')).toThrow(/无法识别的数字：abc/)
  })

  it('无穷大被拒绝', () => {
    expect(() => parseNumbers('1e999')).toThrow(/无法识别的数字/)
  })
})

describe('mode / findMode', () => {
  it('单个众数', () => {
    const r = findMode([3, 5, 3, 7, 3])
    expect(r.modes).toEqual([3])
    expect(r.count).toBe(3)
    expect(r.total).toBe(5)
    expect(r.distinct).toBe(3)
  })

  it('并列众数全部返回且升序', () => {
    const r = findMode([5, 1, 5, 1, 9])
    expect(r.modes).toEqual([1, 5])
    expect(r.count).toBe(2)
  })

  it('全部只出现一次时全部是众数', () => {
    const r = findMode([3, 1, 2])
    expect(r.modes).toEqual([1, 2, 3])
    expect(r.count).toBe(1)
  })
})

describe('mode / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, empty)).toBe('')
    expect(transform({ text: '   ' }, empty)).toBe('')
  })

  it('输出众数 / 次数 / 占比', () => {
    const out = transform({ text: '3, 5, 3, 7, 3, 9, 5, 3, 7' }, empty)
    expect(out).toContain('数据个数：9')
    expect(out).toContain('众数：3')
    expect(out).toContain('出现次数：4 次')
    expect(out).toContain('占比：44.44%')
  })

  it('并列众数加注', () => {
    const out = transform({ text: '1, 2, 1, 2' }, empty)
    expect(out).toContain('众数：1、2')
    expect(out).toContain('有 2 个数值并列')
  })

  it('非法输入抛错', () => {
    expect(() => transform({ text: '1, x' }, empty)).toThrow(/无法识别的数字/)
  })
})
