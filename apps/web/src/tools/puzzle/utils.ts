/** 数字华容道：滑动拼图纯函数（不可变状态） */

export interface PuzzleState {
  size: number
  /** 行优先排列，0 为空格 */
  tiles: number[]
  moves: number
}

export type PuzzleRng = () => number

/** 目标排列：1..n-1，最后为空格 */
export function solvedTiles(size: number): number[] {
  const n = size * size
  const tiles = Array.from({ length: n - 1 }, (_, i) => i + 1)
  tiles.push(0)
  return tiles
}

export function mulberry32(seed: number): PuzzleRng {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function neighbors(idx: number, size: number): number[] {
  const r = Math.floor(idx / size)
  const c = idx % size
  const out: number[] = []
  if (r > 0) out.push(idx - size)
  if (r < size - 1) out.push(idx + size)
  if (c > 0) out.push(idx - 1)
  if (c < size - 1) out.push(idx + 1)
  return out
}

/**
 * 新拼图：从目标态做随机合法移动打乱，保证可解。
 * seed 相同则打乱序列相同。
 */
export function newPuzzle(size = 4, seed = Date.now()): PuzzleState {
  if (!Number.isInteger(size) || size < 2 || size > 6) throw new Error('尺寸必须为 2-6 的整数')
  const tiles = solvedTiles(size)
  const rng = mulberry32(seed)
  let blank = tiles.indexOf(0)
  const steps = size * size * 20
  for (let i = 0; i < steps; i++) {
    const opts = neighbors(blank, size)
    const next = opts[Math.floor(rng() * opts.length)]
    const t = tiles[blank]
    tiles[blank] = tiles[next]
    tiles[next] = t
    blank = next
  }
  return { size, tiles, moves: 0 }
}

/**
 * 滑动数字 tile：与空格相邻则交换并计步，否则原样返回。
 * 棋盘上没有该数字抛中文错。
 */
export function moveTile(state: PuzzleState, tile: number): PuzzleState {
  const idx = state.tiles.indexOf(tile)
  if (idx === -1) throw new Error('棋盘上没有该数字')
  if (tile === 0) throw new Error('不能移动空格')
  const blank = state.tiles.indexOf(0)
  if (!neighbors(blank, state.size).includes(idx)) return state
  const tiles = [...state.tiles]
  tiles[blank] = tile
  tiles[idx] = 0
  return { ...state, tiles, moves: state.moves + 1 }
}

/** 是否复原 */
export function isSolved(state: PuzzleState): boolean {
  const n = state.tiles.length
  for (let i = 0; i < n - 1; i++) {
    if (state.tiles[i] !== i + 1) return false
  }
  return state.tiles[n - 1] === 0
}

/**
 * 逆序数可解性校验（标准规则）：
 * 奇数宽 → 逆序数为偶数；偶数宽 → 逆序数 + 空格所在行（从下数）为奇数。
 */
export function isSolvable(tiles: number[], size: number): boolean {
  const flat = tiles.filter((t) => t !== 0)
  let inv = 0
  for (let i = 0; i < flat.length; i++) {
    for (let j = i + 1; j < flat.length; j++) {
      if (flat[i] > flat[j]) inv++
    }
  }
  if (size % 2 === 1) return inv % 2 === 0
  const blankRowFromBottom = size - Math.floor(tiles.indexOf(0) / size)
  return (inv + blankRowFromBottom) % 2 === 1
}
