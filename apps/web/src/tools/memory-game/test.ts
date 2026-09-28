import { describe, expect, it } from 'vitest'
import { flipCard, isBestScore, isComplete, newDeck, resolveOpen, type MemoryState } from './utils'

function findPair(s: MemoryState): [number, number] {
  for (let i = 0; i < s.cards.length; i++) {
    for (let j = i + 1; j < s.cards.length; j++) {
      if (s.cards[i].value === s.cards[j].value) return [i, j]
    }
  }
  throw new Error('测试牌组中找不到配对')
}

function findNonPair(s: MemoryState): [number, number] {
  for (let i = 0; i < s.cards.length; i++) {
    for (let j = i + 1; j < s.cards.length; j++) {
      if (s.cards[i].value !== s.cards[j].value) return [i, j]
    }
  }
  throw new Error('测试牌组中找不到非配对')
}

describe('记忆游戏逻辑', () => {
  it('newDeck：同一种子牌序相同，每值恰两张', () => {
    const a = newDeck(6, 99)
    const b = newDeck(6, 99)
    expect(a.cards.map((c) => c.value)).toEqual(b.cards.map((c) => c.value))
    expect(a.cards).toHaveLength(12)
    for (let v = 0; v < 6; v++) {
      expect(a.cards.filter((c) => c.value === v)).toHaveLength(2)
    }
    expect(a.moves).toBe(0)
    expect(a.matchedPairs).toBe(0)
    expect(a.open).toEqual([])
  })

  it('newDeck：非法对数抛中文错', () => {
    expect(() => newDeck(1)).toThrow('牌组对数必须为 2-18')
    expect(() => newDeck(19)).toThrow('牌组对数必须为 2-18')
    expect(() => newDeck(2.5)).toThrow('牌组对数必须为 2-18')
  })

  it('flipCard：翻牌计步，再翻同一张原样返回', () => {
    const s = newDeck(4, 7)
    const s1 = flipCard(s, 0)
    expect(s1.cards[0].flipped).toBe(true)
    expect(s1.open).toEqual([0])
    expect(s1.moves).toBe(1)
    expect(s.cards[0].flipped).toBe(false)
    const s2 = flipCard(s1, 0)
    expect(s2).toBe(s1)
  })

  it('flipCard：索引越界抛中文错', () => {
    const s = newDeck(2, 1)
    expect(() => flipCard(s, 99)).toThrow('卡片索引越界')
    expect(() => flipCard(s, -1)).toThrow('卡片索引越界')
  })

  it('flipCard：结算前已有两张翻开时原样返回', () => {
    let s = newDeck(4, 7)
    s = flipCard(s, 0)
    s = flipCard(s, 1)
    expect(s.open).toHaveLength(2)
    const s2 = flipCard(s, 2)
    expect(s2).toBe(s)
  })

  it('resolveOpen：配对成功标记 matched', () => {
    let s = newDeck(4, 7)
    const [a, b] = findPair(s)
    s = flipCard(s, a)
    s = flipCard(s, b)
    const r = resolveOpen(s)
    expect(r.cards[a].matched).toBe(true)
    expect(r.cards[b].matched).toBe(true)
    expect(r.matchedPairs).toBe(1)
    expect(r.open).toEqual([])
  })

  it('resolveOpen：未配对翻回', () => {
    let s = newDeck(4, 7)
    const [a, b] = findNonPair(s)
    s = flipCard(s, a)
    s = flipCard(s, b)
    const r = resolveOpen(s)
    expect(r.cards[a].flipped).toBe(false)
    expect(r.cards[b].flipped).toBe(false)
    expect(r.cards[a].matched).toBe(false)
    expect(r.matchedPairs).toBe(0)
    expect(r.open).toEqual([])
  })

  it('resolveOpen：未满两张原样返回', () => {
    const s = flipCard(newDeck(2, 1), 0)
    expect(resolveOpen(s)).toBe(s)
    expect(resolveOpen(newDeck(2, 1))).toEqual(newDeck(2, 1))
  })

  it('flipCard：已配对的牌原样返回', () => {
    let s = newDeck(2, 3)
    const [a, b] = findPair(s)
    s = resolveOpen(flipCard(flipCard(s, a), b))
    expect(s.cards[a].matched).toBe(true)
    expect(flipCard(s, a)).toBe(s)
  })

  it('isComplete：全部配对完成', () => {
    let s = newDeck(2, 5)
    expect(isComplete(s)).toBe(false)
    const pairs: Array<[number, number]> = []
    const seen = new Map<number, number>()
    s.cards.forEach((c, i) => {
      if (seen.has(c.value)) pairs.push([seen.get(c.value) as number, i])
      else seen.set(c.value, i)
    })
    for (const [a, b] of pairs) {
      s = resolveOpen(flipCard(flipCard(s, a), b))
    }
    expect(s.matchedPairs).toBe(2)
    expect(isComplete(s)).toBe(true)
    expect(isComplete({ ...s, cards: [] })).toBe(false)
  })

  it('isBestScore：无纪录/更少步数为新纪录', () => {
    expect(isBestScore(null, 10)).toBe(true)
    expect(isBestScore(12, 10)).toBe(true)
    expect(isBestScore(10, 10)).toBe(false)
    expect(isBestScore(8, 10)).toBe(false)
  })
})
