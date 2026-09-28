import { describe, expect, it } from 'vitest'
import {
  clearLines,
  collides,
  createBoard,
  dropPiece,
  lockPiece,
  movePiece,
  rotate,
  rotatePiece,
  spawnPiece,
  TETROMINOES,
  type Piece,
  type TetrisBoard,
} from './utils'

const emptyBoard = (): TetrisBoard => createBoard(10, 20)

describe('俄罗斯方块逻辑', () => {
  it('createBoard：非法尺寸抛中文错', () => {
    expect(() => createBoard(3, 20)).toThrow('棋盘至少为 4x4')
    expect(() => createBoard(10, 3)).toThrow('棋盘至少为 4x4')
    expect(() => createBoard(4.5, 20)).toThrow('棋盘至少为 4x4')
  })

  it('TETROMINOES：7 种方块齐全', () => {
    expect(Object.keys(TETROMINOES).sort()).toEqual(['I', 'J', 'L', 'O', 'S', 'T', 'Z'])
  })

  it('rotate：顺时针旋转 90°', () => {
    expect(
      rotate([
        [1, 0, 0],
        [1, 1, 1],
      ]),
    ).toEqual([
      [1, 1],
      [1, 0],
      [1, 0],
    ])
    // O 形旋转不变
    expect(rotate(TETROMINOES.O)).toEqual(TETROMINOES.O)
    // 旋转 4 次回到原形
    let cells = TETROMINOES.T
    for (let i = 0; i < 4; i++) cells = rotate(cells)
    expect(cells).toEqual(TETROMINOES.T)
  })

  it('spawnPiece：在顶部中央生成', () => {
    const p = spawnPiece('I', 10)
    expect(p.y).toBe(0)
    expect(p.x).toBe(3)
    expect(p.cells).toEqual([[1, 1, 1, 1]])
  })

  it('collides：墙壁/底部/已锁定格子/空中', () => {
    const b = emptyBoard()
    const p: Piece = { kind: 'O', cells: TETROMINOES.O, x: 0, y: 0 }
    expect(collides(b, p)).toBe(false)
    expect(collides(b, { ...p, x: -1 })).toBe(true)
    expect(collides(b, { ...p, x: 9 })).toBe(true)
    expect(collides(b, { ...p, y: 19 })).toBe(true)
    const filled = lockPiece(b, { ...p, x: 4, y: 18 })
    expect(collides(filled, { ...p, x: 4, y: 18 })).toBe(true)
    // y<0 的部分允许在棋盘上方
    expect(collides(b, { ...p, y: -1 })).toBe(false)
  })

  it('lockPiece：将方块写入棋盘', () => {
    const b = emptyBoard()
    const n = lockPiece(b, { kind: 'O', cells: TETROMINOES.O, x: 0, y: 0 })
    expect(n[0][0]).toBe(1)
    expect(n[1][1]).toBe(1)
    expect(n[2][2]).toBe(0)
    expect(b[0][0]).toBe(0)
    // 部分在棋盘上方的方块：上方格子被跳过
    const n2 = lockPiece(b, { kind: 'O', cells: TETROMINOES.O, x: 0, y: -1 })
    expect(n2[0][0]).toBe(1)
    expect(n2[0][1]).toBe(1)
  })

  it('clearLines：消行并计分', () => {
    const b = emptyBoard()
    b[19] = Array(10).fill(1)
    b[18] = Array(10).fill(1)
    b[17][0] = 1
    const { board, cleared, score } = clearLines(b)
    expect(cleared).toBe(2)
    expect(score).toBe(400)
    expect(board).toHaveLength(20)
    expect(board[19][0]).toBe(1)
    expect(board[18].every((v) => v === 0)).toBe(true)
  })

  it('clearLines：无满行时不变', () => {
    const b = emptyBoard()
    const { board, cleared, score } = clearLines(b)
    expect(cleared).toBe(0)
    expect(score).toBe(0)
    expect(board).toEqual(b)
  })

  it('movePiece：合法移动返回新方块，碰撞返回 null', () => {
    const b = emptyBoard()
    const p: Piece = { kind: 'O', cells: TETROMINOES.O, x: 4, y: 0 }
    const m = movePiece(b, p, 1, 0)
    expect(m).toEqual({ ...p, x: 5, y: 0 })
    expect(movePiece(b, { ...p, x: 0 }, -1, 0)).toBeNull()
  })

  it('rotatePiece：旋转成功与被挡住两种情况', () => {
    const b = emptyBoard()
    const p: Piece = { kind: 'T', cells: TETROMINOES.T, x: 4, y: 0 }
    const r = rotatePiece(b, p)
    expect(r.cells).toEqual(rotate(p.cells))
    // 贴墙旋转会撞墙则保持原状
    const wall: Piece = { kind: 'I', cells: [[1], [1], [1], [1]], x: 8, y: 0 }
    expect(rotatePiece(b, wall)).toBe(wall)
  })

  it('dropPiece：硬降到底部', () => {
    const b = emptyBoard()
    const p: Piece = { kind: 'O', cells: TETROMINOES.O, x: 4, y: 0 }
    const d = dropPiece(b, p)
    expect(d.y).toBe(18)
    expect(movePiece(b, d, 0, 1)).toBeNull()
  })
})
