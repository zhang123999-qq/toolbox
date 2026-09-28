/** 2048：棋盘滑动合并纯函数（不可变） */

export type Board = number[][]
export type MoveDir = 'left' | 'right' | 'up' | 'down'
export type TileRng = () => number

export function createBoard(size = 4): Board {
  if (!Number.isInteger(size) || size < 2) throw new Error('棋盘尺寸至少为 2')
  return Array.from({ length: size }, () => Array(size).fill(0))
}

/** 单行向左滑动合并，返回新行与本次合并得分 */
export function slideRowLeft(row: number[]): { row: number[]; gained: number } {
  const tiles = row.filter((v) => v !== 0)
  const out: number[] = []
  let gained = 0
  for (let i = 0; i < tiles.length; i++) {
    if (i + 1 < tiles.length && tiles[i] === tiles[i + 1]) {
      const v = tiles[i] * 2
      out.push(v)
      gained += v
      i++
    } else {
      out.push(tiles[i])
    }
  }
  while (out.length < row.length) out.push(0)
  return { row: out, gained }
}

function transpose(board: Board): Board {
  return board[0].map((_, c) => board.map((row) => row[c]))
}

function reverseRows(board: Board): Board {
  return board.map((r) => r.slice().reverse())
}

/** 向指定方向滑动整个棋盘 */
export function moveBoard(board: Board, dir: MoveDir): { board: Board; gained: number; moved: boolean } {
  let b = board
  if (dir === 'up' || dir === 'down') b = transpose(b)
  if (dir === 'right' || dir === 'down') b = reverseRows(b)
  let gained = 0
  const slid = b.map((row) => {
    const r = slideRowLeft(row)
    gained += r.gained
    return r.row
  })
  let out = slid
  if (dir === 'right' || dir === 'down') out = reverseRows(out)
  if (dir === 'up' || dir === 'down') out = transpose(out)
  const moved = out.some((row, r) => row.some((v, c) => v !== board[r][c]))
  return { board: out, gained, moved }
}

/** 在随机空格生成新砖块（90% 为 2，10% 为 4） */
export function spawnTile(board: Board, rng: TileRng = Math.random): Board {
  const empty: Array<[number, number]> = []
  board.forEach((row, r) => row.forEach((v, c) => {
    if (v === 0) empty.push([r, c])
  }))
  if (empty.length === 0) return board
  const [r, c] = empty[Math.floor(rng() * empty.length)]
  const value = rng() < 0.9 ? 2 : 4
  return board.map((row, ri) => row.map((v, ci) => (ri === r && ci === c ? value : v)))
}

/** 无空格且无可合并相邻格时游戏结束 */
export function isGameOver(board: Board): boolean {
  const n = board.length
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      if (board[r][c] === 0) return false
      if (c + 1 < n && board[r][c] === board[r][c + 1]) return false
      if (r + 1 < n && board[r][c] === board[r + 1][c]) return false
    }
  }
  return true
}

/** 棋盘总分（所有砖块之和） */
export function boardScore(board: Board): number {
  return board.reduce((sum, row) => sum + row.reduce((s, v) => s + v, 0), 0)
}
