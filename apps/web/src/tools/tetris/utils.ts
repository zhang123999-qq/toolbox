/** 俄罗斯方块：方块旋转、碰撞、消行纯函数（不可变） */

export type TetrominoKind = 'I' | 'O' | 'T' | 'S' | 'Z' | 'J' | 'L'
export type TetrisBoard = number[][]

export const TETROMINOES: Record<TetrominoKind, number[][]> = {
  I: [[1, 1, 1, 1]],
  O: [
    [1, 1],
    [1, 1],
  ],
  T: [
    [0, 1, 0],
    [1, 1, 1],
  ],
  S: [
    [0, 1, 1],
    [1, 1, 0],
  ],
  Z: [
    [1, 1, 0],
    [0, 1, 1],
  ],
  J: [
    [1, 0, 0],
    [1, 1, 1],
  ],
  L: [
    [0, 0, 1],
    [1, 1, 1],
  ],
}

export interface Piece {
  kind: TetrominoKind
  cells: number[][]
  x: number
  y: number
}

export function createBoard(w = 10, h = 20): TetrisBoard {
  if (!Number.isInteger(w) || w < 4 || !Number.isInteger(h) || h < 4) {
    throw new Error('棋盘至少为 4x4')
  }
  return Array.from({ length: h }, () => Array(w).fill(0))
}

/** 顺时针旋转 90° */
export function rotate(cells: number[][]): number[][] {
  const rows = cells.length
  const cols = cells[0].length
  return Array.from({ length: cols }, (_, c) =>
    Array.from({ length: rows }, (_, r) => cells[rows - 1 - r][c]),
  )
}

/** 在顶部中央生成新方块 */
export function spawnPiece(kind: TetrominoKind, boardWidth = 10): Piece {
  const shape = TETROMINOES[kind]
  return {
    kind,
    cells: shape.map((r) => r.slice()),
    x: Math.floor(boardWidth / 2) - Math.floor(shape[0].length / 2),
    y: 0,
  }
}

/** 方块当前位置是否与墙壁/已锁定格子碰撞 */
export function collides(board: TetrisBoard, piece: Piece): boolean {
  const h = board.length
  const w = board[0].length
  for (let r = 0; r < piece.cells.length; r++) {
    for (let c = 0; c < piece.cells[r].length; c++) {
      if (!piece.cells[r][c]) continue
      const bx = piece.x + c
      const by = piece.y + r
      if (bx < 0 || bx >= w || by >= h) return true
      if (by >= 0 && board[by][bx]) return true
    }
  }
  return false
}

/** 将方块锁定到棋盘上 */
export function lockPiece(board: TetrisBoard, piece: Piece): TetrisBoard {
  const next = board.map((row) => row.slice())
  for (let r = 0; r < piece.cells.length; r++) {
    for (let c = 0; c < piece.cells[r].length; c++) {
      if (piece.cells[r][c] && piece.y + r >= 0) next[piece.y + r][piece.x + c] = 1
    }
  }
  return next
}

/** 消除满行并计分（n²×100） */
export function clearLines(board: TetrisBoard): {
  board: TetrisBoard
  cleared: number
  score: number
} {
  const w = board[0].length
  const kept = board.filter((row) => row.some((v) => v === 0))
  const cleared = board.length - kept.length
  const fresh = Array.from({ length: cleared }, () => Array(w).fill(0))
  return { board: [...fresh, ...kept], cleared, score: cleared * cleared * 100 }
}

/** 尝试移动方块；碰撞则返回 null */
export function movePiece(board: TetrisBoard, piece: Piece, dx: number, dy: number): Piece | null {
  const next = { ...piece, x: piece.x + dx, y: piece.y + dy }
  return collides(board, next) ? null : next
}

/** 尝试旋转方块；碰撞则保持原状 */
export function rotatePiece(board: TetrisBoard, piece: Piece): Piece {
  const next = { ...piece, cells: rotate(piece.cells) }
  return collides(board, next) ? piece : next
}

/** 硬降：直接落到最低合法位置 */
export function dropPiece(board: TetrisBoard, piece: Piece): Piece {
  let cur = piece
  for (;;) {
    const next = movePiece(board, cur, 0, 1)
    if (!next) return cur
    cur = next
  }
}
