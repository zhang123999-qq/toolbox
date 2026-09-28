/** 翻牌配对记忆游戏纯函数（不可变状态） */

export interface MemoryCard {
  id: number
  /** 配对值：0..pairs-1 */
  value: number
  flipped: boolean
  matched: boolean
}

export interface MemoryState {
  cards: MemoryCard[]
  moves: number
  matchedPairs: number
  /** 当前翻开但未结算的卡索引（0 或 1 张；结算前最多 2 张） */
  open: number[]
}

export type MemoryRng = () => number

export function mulberry32(seed: number): MemoryRng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function shuffled<T>(arr: T[], rng: MemoryRng): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

/** 新牌组：pairs 对牌洗牌，seed 相同则牌序相同 */
export function newDeck(pairs: number, seed = Date.now()): MemoryState {
  if (!Number.isInteger(pairs) || pairs < 2 || pairs > 18) throw new Error('牌组对数必须为 2-18')
  const rng = mulberry32(seed)
  const values = shuffled(
    Array.from({ length: pairs * 2 }, (_, i) => Math.floor(i / 2)),
    rng,
  )
  return {
    cards: values.map((value, id) => ({ id, value, flipped: false, matched: false })),
    moves: 0,
    matchedPairs: 0,
    open: [],
  }
}

/**
 * 翻牌：已翻开/已配对/结算前已有两张翻开时原样返回；
 * 索引越界抛中文错。每次有效翻牌计一步。
 */
export function flipCard(state: MemoryState, idx: number): MemoryState {
  const card = state.cards[idx]
  if (!card) throw new Error('卡片索引越界')
  if (card.flipped || card.matched || state.open.length >= 2) return state
  const cards = state.cards.map((c) => (c.id === idx ? { ...c, flipped: true } : c))
  return { ...state, cards, open: [...state.open, idx], moves: state.moves + 1 }
}

/**
 * 结算当前翻开的两张：同值则标记配对，否则翻回。
 * 未满两张时原样返回。
 */
export function resolveOpen(state: MemoryState): MemoryState {
  if (state.open.length < 2) return state
  const [a, b] = state.open
  const matched = state.cards[a].value === state.cards[b].value
  const cards = state.cards.map((c) =>
    c.id === a || c.id === b ? { ...c, matched, flipped: matched } : c,
  )
  return { ...state, cards, open: [], matchedPairs: state.matchedPairs + (matched ? 1 : 0) }
}

/** 是否全部配对完成 */
export function isComplete(state: MemoryState): boolean {
  return state.cards.length > 0 && state.cards.every((c) => c.matched)
}

/** 最佳成绩比较：步数越少越好；无历史成绩或更少步数则为新纪录 */
export function isBestScore(best: number | null, moves: number): boolean {
  return best === null || moves < best
}
