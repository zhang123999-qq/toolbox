/** 五子棋：15×15 棋盘逻辑纯函数（不可变状态） */

export const BOARD_SIZE = 15

/** 0 空，1 黑（玩家），2 白（AI） */
export type Stone = 0 | 1 | 2
export type GomokuBoard = Stone[][]
export type GomokuRng = () => number

const DIRS: Array<[number, number]> = [
  [1, 0],
  [0, 1],
  [1, 1],
  [1, -1],
]

export function createBoard(size = BOARD_SIZE): GomokuBoard {
  if (!Number.isInteger(size) || size < 5) throw new Error('棋盘尺寸至少为 5')
  return Array.from({ length: size }, () => Array<Stone>(size).fill(0))
}

/** 落子：返回新棋盘，非法位置/颜色/占用抛中文错 */
export function placeStone(board: GomokuBoard, x: number, y: number, color: 1 | 2): GomokuBoard {
  const size = board.length
  if (!Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= size || y >= size) {
    throw new Error('落子位置超出棋盘')
  }
  if (color !== 1 && color !== 2) throw new Error('棋子颜色必须为黑或白')
  if (board[y][x] !== 0) throw new Error('该位置已有棋子')
  return board.map((row, j) => (j === y ? row.map((c, i) => (i === x ? color : c)) : row))
}

/** (x,y) 处是否形成五连（四方向计数） */
export function checkWin(board: GomokuBoard, x: number, y: number): boolean {
  const color = board[y][x]
  if (color === 0) return false
  const size = board.length
  for (const [dx, dy] of DIRS) {
    let count = 1
    for (const step of [1, -1]) {
      let nx = x + dx * step
      let ny = y + dy * step
      while (nx >= 0 && ny >= 0 && nx < size && ny < size && board[ny][nx] === color) {
        count++
        nx += dx * step
        ny += dy * step
      }
    }
    if (count >= 5) return true
  }
  return false
}

/** 棋盘是否已满 */
export function isFull(board: GomokuBoard): boolean {
  return board.every((row) => row.every((c) => c !== 0))
}

function findImmediateWin(board: GomokuBoard, color: 1 | 2): { x: number; y: number } | null {
  const size = board.length
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 0 && checkWin(placeStone(board, x, y, color), x, y)) {
        return { x, y }
      }
    }
  }
  return null
}

/**
 * 简易 AI（白方）：优先自己成五，其次堵黑方成五，否则随机空位。
 * rng 可注入以便测试确定性。
 */
export function aiMove(board: GomokuBoard, rng: GomokuRng = Math.random): { x: number; y: number } {
  const win = findImmediateWin(board, 2)
  if (win) return win
  const block = findImmediateWin(board, 1)
  if (block) return block
  const size = board.length
  const empty: Array<[number, number]> = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (board[y][x] === 0) empty.push([x, y])
    }
  }
  if (empty.length === 0) throw new Error('棋盘已满，无可落子位置')
  const [x, y] = empty[Math.floor(rng() * empty.length)]
  return { x, y }
}
