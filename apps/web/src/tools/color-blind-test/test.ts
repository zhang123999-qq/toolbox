import { describe, expect, it } from 'vitest'
import {
  BG_COLOR,
  DIGIT_COLOR,
  genIshiharaPlate,
  gradeColorBlind,
  mulberry32,
  PLATES,
  scorePlates,
} from './utils'

describe('色盲测试逻辑', () => {
  it('PLATES：5 张测试图', () => {
    expect(PLATES.length).toBe(5)
    expect(PLATES[0].digit).toBe('12')
  })

  it('mulberry32：同一种子序列一致', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('mulberry32：不同种子序列不同', () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)())
  })

  it('genIshiharaPlate：44×44=1936 个点', () => {
    const dots = genIshiharaPlate('6', 7)
    expect(dots.length).toBe(44 * 44)
  })

  it('genIshiharaPlate：同一种子点阵一致', () => {
    expect(genIshiharaPlate('12', 3)).toEqual(genIshiharaPlate('12', 3))
  })

  it('genIshiharaPlate：数字笔画点与背景点都存在', () => {
    const dots = genIshiharaPlate('12', 3)
    expect(dots.some((d) => d.isDigit)).toBe(true)
    expect(dots.some((d) => !d.isDigit)).toBe(true)
  })

  it('genIshiharaPlate：半径在合理范围', () => {
    const dots = genIshiharaPlate('5', 1)
    for (const d of dots) {
      expect(d.r).toBeGreaterThanOrEqual(0.55)
      expect(d.r).toBeLessThan(1)
    }
  })

  it('genIshiharaPlate：非数字抛中文错', () => {
    expect(() => genIshiharaPlate('ab', 1)).toThrow('色盲图仅支持数字')
    expect(() => genIshiharaPlate('', 1)).toThrow('色盲图仅支持数字')
    expect(() => genIshiharaPlate('1a', 1)).toThrow('色盲图仅支持数字')
  })

  it('颜色常量存在', () => {
    expect(DIGIT_COLOR).toMatch(/^#/)
    expect(BG_COLOR).toMatch(/^#/)
    expect(DIGIT_COLOR).not.toBe(BG_COLOR)
  })

  it('scorePlates：全对', () => {
    expect(scorePlates(['12', '6', '74', '2', '5'])).toEqual({ correct: 5, total: 5 })
  })

  it('scorePlates：答案去空格比对', () => {
    expect(scorePlates([' 12 ', '6', 'x', '2', ''])).toEqual({ correct: 3, total: 5 })
  })

  it('scorePlates：答案不足按缺考计', () => {
    expect(scorePlates(['12'])).toEqual({ correct: 1, total: 5 })
    expect(scorePlates([])).toEqual({ correct: 0, total: 5 })
  })

  it('gradeColorBlind：各档文案', () => {
    expect(gradeColorBlind(5, 5)).toBe('色觉正常')
    expect(gradeColorBlind(4, 5)).toBe('色觉正常')
    expect(gradeColorBlind(3, 5)).toBe('可能存在轻微色觉异常')
    expect(gradeColorBlind(1, 5)).toBe('建议到医院眼科做进一步检查')
    expect(gradeColorBlind(0, 5)).toBe('建议到医院眼科做进一步检查')
    expect(gradeColorBlind(0, 0)).toBe('无数据')
  })
})
