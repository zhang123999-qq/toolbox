/**
 * fortune（#841）utils 单测：求签（rng 全注入，确定性）。
 */
import { describe, expect, it } from 'vitest'
import { FORTUNES, LUCKS, drawFortune, formatFortune, fortunesByLuck, type Rng } from './utils'

const seq = (...vs: number[]): Rng => {
  let i = 0
  return () => vs[Math.min(i++, vs.length - 1)] as number
}

describe('FORTUNES', () => {
  it('30 签齐全且签号连续', () => {
    expect(FORTUNES).toHaveLength(30)
    expect(FORTUNES.map((f) => f.no)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1))
  })
  it('每签有吉凶、签文与解曰', () => {
    for (const f of FORTUNES) {
      expect(LUCKS).toContain(f.luck)
      expect(f.title.length).toBeGreaterThan(0)
      expect(f.verse.length).toBeGreaterThan(0)
      expect(f.meaning.length).toBeGreaterThan(0)
    }
  })
  it('五等吉凶皆有签文', () => {
    for (const luck of LUCKS) {
      expect(FORTUNES.some((f) => f.luck === luck)).toBe(true)
    }
  })
})

describe('drawFortune', () => {
  it('rng=0 抽到第 1 签', () => {
    const f = drawFortune(() => 0)
    expect(f.no).toBe(1)
    expect(f.luck).toBe('上上')
  })
  it('rng=0.999 抽到第 30 签', () => {
    const f = drawFortune(() => 0.999)
    expect(f.no).toBe(30)
  })
  it('rng 中间值抽到对应签', () => {
    const f = drawFortune(() => 0.5)
    expect(f.no).toBe(16)
  })
  it('rng 返回 1 触发保护分支', () => {
    expect(() => drawFortune(() => 1)).toThrow('求签失败：签筒为空')
  })
  it('seq 注入可用', () => {
    expect(drawFortune(seq(0.1)).no).toBe(4)
  })
})

describe('fortunesByLuck', () => {
  it('按上上筛选', () => {
    const list = fortunesByLuck('上上')
    expect(list.length).toBeGreaterThan(0)
    expect(list.every((f) => f.luck === '上上')).toBe(true)
  })
  it('按下下筛选', () => {
    const list = fortunesByLuck('下下')
    expect(list.every((f) => f.luck === '下下')).toBe(true)
  })
  it('未知等级抛中文错误', () => {
    expect(() => fortunesByLuck('大吉')).toThrow('没有「大吉」等级的签文')
  })
})

describe('formatFortune', () => {
  it('含签号、吉凶、签文与解曰', () => {
    const s = formatFortune(FORTUNES[0] as (typeof FORTUNES)[number])
    expect(s).toContain('第 1 签大展宏图')
    expect(s).toContain('解曰：')
  })
})
