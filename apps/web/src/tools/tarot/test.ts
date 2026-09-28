/**
 * tarot（#840）utils 单测：牌阵抽取（rng 全注入，确定性）。
 */
import { describe, expect, it } from 'vitest'
import {
  MAJOR_ARCANA,
  SPREADS,
  drawCards,
  drawSpread,
  formatDrawn,
  getSpread,
  type Rng,
} from './utils'

const zero: Rng = () => 0
const seq = (...vs: number[]): Rng => {
  let i = 0
  return () => vs[Math.min(i++, vs.length - 1)] as number
}

describe('MAJOR_ARCANA', () => {
  it('22 张大阿卡纳齐全', () => {
    expect(MAJOR_ARCANA).toHaveLength(22)
  })
  it('每张有正逆位解读', () => {
    for (const c of MAJOR_ARCANA) {
      expect(c.upright.length).toBeGreaterThan(0)
      expect(c.reversed.length).toBeGreaterThan(0)
    }
  })
})

describe('SPREADS', () => {
  it('单张/三张/十字三种牌阵', () => {
    expect(SPREADS.map((s) => s.id)).toEqual(['single', 'three', 'cross'])
    expect(getSpread('three').positions).toEqual(['过去', '现在', '未来'])
  })
})

describe('getSpread', () => {
  it('未知牌阵抛中文错误', () => {
    expect(() => getSpread('nope')).toThrow('未知的牌阵：nope')
  })
})

describe('drawCards', () => {
  it('rng 全 0 → 依次抽前 N 张且全逆位', () => {
    const cards = drawCards(3, zero)
    expect(cards.map((c) => c.card.id)).toEqual(['fool', 'magician', 'priestess'])
    expect(cards.every((c) => c.reversed)).toBe(true)
  })
  it('rng 0.9 → 全正位', () => {
    const cards = drawCards(1, () => 0.9)
    expect(cards[0]?.reversed).toBe(false)
  })
  it('抽牌不重复', () => {
    const cards = drawCards(22, seq(0, 0.5, 0.5, 0.9, 0.1, 0.7))
    const ids = cards.map((c) => c.card.id)
    expect(new Set(ids).size).toBe(22)
  })
  it('非法数量抛中文错误', () => {
    expect(() => drawCards(0)).toThrow('抽牌数量必须在 1 到 22 之间')
    expect(() => drawCards(23)).toThrow('抽牌数量必须在 1 到 22 之间')
    expect(() => drawCards(1.5)).toThrow('抽牌数量必须在 1 到 22 之间')
  })
  it('rng 返回 1 触发牌堆保护分支', () => {
    expect(() => drawCards(1, () => 1)).toThrow('抽牌失败：牌堆为空')
  })
})

describe('drawSpread', () => {
  it('三张牌阵牌位与牌一一对应', () => {
    const spread = drawSpread('three', zero)
    expect(spread.map((d) => d.position)).toEqual(['过去', '现在', '未来'])
    expect(spread[0]?.card.id).toBe('fool')
  })
  it('单张牌阵抽 1 张', () => {
    expect(drawSpread('single', zero)).toHaveLength(1)
  })
  it('未知牌阵抛错', () => {
    expect(() => drawSpread('nope', zero)).toThrow('未知的牌阵')
  })
})

describe('formatDrawn', () => {
  it('正位用正位解读', () => {
    const s = formatDrawn({
      card: MAJOR_ARCANA[0] as (typeof MAJOR_ARCANA)[number],
      reversed: false,
      position: '指引',
    })
    expect(s).toContain('愚者')
    expect(s).toContain('正位')
    expect(s).toContain('新的开始')
  })
  it('逆位用逆位解读', () => {
    const s = formatDrawn({
      card: MAJOR_ARCANA[0] as (typeof MAJOR_ARCANA)[number],
      reversed: true,
      position: '指引',
    })
    expect(s).toContain('逆位')
    expect(s).toContain('鲁莽')
  })
})
