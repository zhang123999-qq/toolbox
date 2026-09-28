/** 数独：求解/生成/校验纯函数 */

export type SudokuCell = number // 0-9，0 为空格
export type SudokuBoard = SudokuCell[][]
export type Difficulty = 'easy' | 'medium' | 'hard'

const DIG_COUNT: Record<Difficulty, number> = { easy: 35, medium: 45, hard: 52 }

function hasDup(values: SudokuCell[]): boolean {
  const seen = new Set<number>()
  for (const v of values) {
    if (v === 0) continue
    if (seen.has(v)) return true
    seen.add(v)
  }
  return false
}

/** 校验 9×9 棋盘无行列宫冲突；非法尺寸抛中文错 */
export function isValid(board: SudokuBoard): boolean {
  if (board.length !== 9 || board.some((r) => r.length !== 9)) throw new Error('数独棋盘必须为 9x9')
  for (let i = 0; i < 9; i++) {
    const col = board.map((r) => r[i])
    if (hasDup(board[i]) || hasDup(col)) return false
    const br = Math.floor(i / 3) * 3
    const bc = (i % 3) * 3
    const box: SudokuCell[] = []
    for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) box.push(board[br + dy][bc + dx])
    if (hasDup(box)) return false
  }
  return true
}

function findEmpty(board: SudokuBoard): [number, number] | null {
  for (let y = 0; y < 9; y++) for (let x = 0; x < 9; x++) if (board[y][x] === 0) return [x, y]
  return null
}

function canPlace(board: SudokuBoard, x: number, y: number, n: number): boolean {
  for (let i = 0; i < 9; i++) {
    if (board[y][i] === n || board[i][x] === n) return false
  }
  const br = Math.floor(y / 3) * 3
  const bc = Math.floor(x / 3) * 3
  for (let dy = 0; dy < 3; dy++)
    for (let dx = 0; dx < 3; dx++) if (board[br + dy][bc + dx] === n) return false
  return true
}

/** 回溯求解：返回解棋盘；无解或输入冲突返回 null（MRV 启发式） */
export function solve(board: SudokuBoard): SudokuBoard | null {
  if (!isValid(board)) return null
  const b = board.map((r) => [...r])
  const search = (): boolean => {
    // 选候选数最少的空格（MRV）
    let bx = -1
    let by = -1
    let best: number[] = []
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (b[y][x] !== 0) continue
        const cands: number[] = []
        for (let n = 1; n <= 9; n++) if (canPlace(b, x, y, n)) cands.push(n)
        if (cands.length === 0) return false
        if (bx === -1 || cands.length < best.length) {
          bx = x
          by = y
          best = cands
          if (best.length === 1) break
        }
      }
      if (best.length === 1) break
    }
    if (bx === -1) return true
    for (const n of best) {
      b[by][bx] = n
      if (search()) return true
      b[by][bx] = 0
    }
    return false
  }
  return search() ? b : null
}

/** 统计解数，最多数到 limit（提前退出） */
export function countSolutions(board: SudokuBoard, limit = 2): number {
  if (!Number.isInteger(limit) || limit < 1) throw new Error('上限至少为 1')
  const b = board.map((r) => [...r])
  let count = 0
  const search = (): void => {
    if (count >= limit) return
    let bx = -1
    let by = -1
    let best: number[] = []
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (b[y][x] !== 0) continue
        const cands: number[] = []
        for (let n = 1; n <= 9; n++) if (canPlace(b, x, y, n)) cands.push(n)
        if (cands.length === 0) return
        if (bx === -1 || cands.length < best.length) {
          bx = x
          by = y
          best = cands
          if (best.length === 1) break
        }
      }
      if (best.length === 1) break
    }
    if (bx === -1) {
      count++
      return
    }
    for (const n of best) {
      b[by][bx] = n
      search()
      b[by][bx] = 0
    }
  }
  search()
  return count
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * 尝试挖去 (x,y)：挖空后仍唯一解则返回新棋盘，否则返回 null（恢复原样）。
 * 纯函数，不修改输入。
 */
export function digCell(puzzle: SudokuBoard, x: number, y: number): SudokuBoard | null {
  if (puzzle[y][x] === 0) return null
  const next = puzzle.map((r) => [...r])
  next[y][x] = 0
  if (countSolutions(next, 2) === 1) return next
  return null
}

function shuffled<T>(arr: T[], rng: () => number): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const t = a[i]
    a[i] = a[j]
    a[j] = t
  }
  return a
}

function fillBoard(rng: () => number): SudokuBoard {
  const b: SudokuBoard = Array.from({ length: 9 }, () => Array(9).fill(0))
  const fill = (): boolean => {
    const empty = findEmpty(b)
    if (!empty) return true
    const [x, y] = empty
    for (const n of shuffled([1, 2, 3, 4, 5, 6, 7, 8, 9], rng)) {
      if (canPlace(b, x, y, n)) {
        b[y][x] = n
        if (fill()) return true
        b[y][x] = 0
      }
    }
    return false
  }
  fill()
  return b
}

/**
 * 生成数独题目：随机填满终盘后挖空，挖空后用解数校验保证唯一解。
 * seed 相同则题目相同。
 */
export function genPuzzle(
  difficulty: Difficulty = 'medium',
  seed = Date.now(),
): { puzzle: SudokuBoard; solution: SudokuBoard } {
  if (!(difficulty in DIG_COUNT)) throw new Error('难度必须为 easy/medium/hard')
  const rng = mulberry32(seed)
  const solution = fillBoard(rng)
  let puzzle = solution.map((r) => [...r])
  const cells = shuffled(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  )
  let dug = 0
  const target = DIG_COUNT[difficulty]
  for (const idx of cells) {
    if (dug >= target) break
    const y = Math.floor(idx / 9)
    const x = idx % 9
    const next = digCell(puzzle, x, y)
    if (next) {
      puzzle = next
      dug++
    }
  }
  return { puzzle, solution }
}
