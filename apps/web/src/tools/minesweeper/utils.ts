/** 扫雷：棋盘生成与揭示逻辑（不可变，可复现种子） */

export interface MsCell {
  mine: boolean
  revealed: boolean
  flagged: boolean
  adjacent: number
}

export type MsBoard = MsCell[][]

/** mulberry32 可复现随机数 */
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

function neighbors(w: number, h: number, x: number, y: number): Array<[number, number]> {
  const out: Array<[number, number]> = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue
      const nx = x + dx
      const ny = y + dy
      if (nx >= 0 && ny >= 0 && nx < w && ny < h) out.push([nx, ny])
    }
  }
  return out
}

function inBounds(board: MsBoard, x: number, y: number): boolean {
  return y >= 0 && y < board.length && x >= 0 && x < board[0].length
}

/** 生成布雷棋盘（Fisher-Yates 洗牌，种子可复现） */
export function genBoard(w: number, h: number, mines: number, seed = Date.now()): MsBoard {
  if (!Number.isInteger(w) || w < 2 || !Number.isInteger(h) || h < 2) {
    throw new Error('棋盘至少为 2x2')
  }
  if (!Number.isInteger(mines) || mines < 1 || mines >= w * h) {
    throw new Error('地雷数须在 1 到格子总数减一之间')
  }
  const rng = mulberry32(seed)
  const idx = Array.from({ length: w * h }, (_, i) => i)
  for (let i = idx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = idx[i]
    idx[i] = idx[j]
    idx[j] = tmp
  }
  const mineSet = new Set(idx.slice(0, mines))
  const board: MsBoard = Array.from({ length: h }, (_, y) =>
    Array.from({ length: w }, (_, x) => ({
      mine: mineSet.has(y * w + x),
      revealed: false,
      flagged: false,
      adjacent: 0,
    })),
  )
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      board[y][x].adjacent = neighbors(w, h, x, y).filter(([nx, ny]) => board[ny][nx].mine).length
    }
  }
  return board
}

/** 揭开格子：空白格泛洪展开；返回是否踩雷 */
export function reveal(board: MsBoard, x: number, y: number): { board: MsBoard; hitMine: boolean } {
  if (!inBounds(board, x, y)) throw new Error('坐标越界')
  const next = board.map((row) => row.map((c) => ({ ...c })))
  const cell = next[y][x]
  if (cell.revealed || cell.flagged) return { board: next, hitMine: false }
  cell.revealed = true
  if (cell.mine) return { board: next, hitMine: true }
  if (cell.adjacent === 0) {
    const stack: Array<[number, number]> = [[x, y]]
    while (stack.length > 0) {
      const [cx, cy] = stack.pop() as [number, number]
      for (const [nx, ny] of neighbors(next[0].length, next.length, cx, cy)) {
        const n = next[ny][nx]
        if (!n.revealed && !n.flagged && !n.mine) {
          n.revealed = true
          if (n.adjacent === 0) stack.push([nx, ny])
        }
      }
    }
  }
  return { board: next, hitMine: false }
}

/** 切换旗帜（已揭开的格子不可插旗） */
export function toggleFlag(board: MsBoard, x: number, y: number): MsBoard {
  if (!inBounds(board, x, y)) throw new Error('坐标越界')
  return board.map((row, ry) =>
    row.map((c, cx) => (ry === y && cx === x && !c.revealed ? { ...c, flagged: !c.flagged } : { ...c })),
  )
}

/** 全部非雷格子都已揭开即胜利 */
export function checkWin(board: MsBoard): boolean {
  return board.every((row) => row.every((c) => c.mine || c.revealed))
}

/** 旗帜数量 */
export function countFlags(board: MsBoard): number {
  return board.reduce((n, row) => n + row.filter((c) => c.flagged).length, 0)
}
