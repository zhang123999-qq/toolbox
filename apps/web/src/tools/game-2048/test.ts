import { describe, expect, it } from 'vitest'
import {
  boardScore,
  createBoard,
  isGameOver,
  moveBoard,
  slideRowLeft,
  spawnTile,
  type Board,
} from './utils'

const rng0 = () => 0

describe('2048 逻辑', () => {
  it('createBoard：非法尺寸抛中文错', () => {
    expect(() => createBoard(1)).toThrow('棋盘尺寸至少为 2')
    expect(() => createBoard(2.5)).toThrow('棋盘尺寸至少为 2')
    expect(createBoard(2)).toEqual([
      [0, 0],
      [0, 0],
    ])
  })

  it('slideRowLeft：合并与得分', () => {
    expect(slideRowLeft([2, 2, 0, 0])).toEqual({ row: [4, 0, 0, 0], gained: 4 })
    expect(slideRowLeft([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8 })
    expect(slideRowLeft([2, 0, 2, 4])).toEqual({ row: [4, 4, 0, 0], gained: 4 })
    expect(slideRowLeft([4, 2, 2, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4 })
    expect(slideRowLeft([2, 4, 8, 16])).toEqual({ row: [2, 4, 8, 16], gained: 0 })
    expect(slideRowLeft([0, 0, 0, 0])).toEqual({ row: [0, 0, 0, 0], gained: 0 })
  })

  it('moveBoard：四个方向', () => {
    const b: Board = [
      [2, 0, 0, 0],
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    const up = moveBoard(b, 'up')
    expect(up.board[0][0]).toBe(4)
    expect(up.gained).toBe(4)
    expect(up.moved).toBe(true)

    const down = moveBoard(b, 'down')
    expect(down.board[3][0]).toBe(4)

    const row: Board = [
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    const left = moveBoard(row, 'left')
    expect(left.board[0]).toEqual([4, 0, 0, 0])
    const right = moveBoard(row, 'right')
    expect(right.board[0]).toEqual([0, 0, 0, 4])
  })

  it('moveBoard：无变化时 moved 为 false', () => {
    const b: Board = [
      [2, 4, 8, 16],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ]
    const r = moveBoard(b, 'left')
    expect(r.moved).toBe(false)
    expect(r.gained).toBe(0)
  })

  it('spawnTile：空格生成砖块；满盘返回原棋盘', () => {
    const b: Board = [
      [2, 0],
      [0, 0],
    ]
    const n = spawnTile(b, rng0)
    expect(n[0][0]).toBe(2)
    const full: Board = [
      [2, 4],
      [8, 16],
    ]
    expect(spawnTile(full, rng0)).toBe(full)
  })

  it('spawnTile：10% 概率生成 4', () => {
    const b: Board = [
      [0, 0],
      [0, 0],
    ]
    const n = spawnTile(b, () => 0.95)
    const values = n.flat().filter((v) => v !== 0)
    expect(values).toHaveLength(1)
    expect(values[0]).toBe(4)
  })

  it('isGameOver：有空格/可合并则未结束', () => {
    expect(
      isGameOver([
        [2, 0],
        [0, 0],
      ]),
    ).toBe(false)
    expect(
      isGameOver([
        [2, 2],
        [4, 8],
      ]),
    ).toBe(false)
    expect(
      isGameOver([
        [2, 4],
        [2, 8],
      ]),
    ).toBe(false)
    expect(
      isGameOver([
        [2, 4],
        [8, 16],
      ]),
    ).toBe(true)
  })

  it('boardScore：所有砖块之和', () => {
    expect(
      boardScore([
        [2, 4],
        [8, 0],
      ]),
    ).toBe(14)
  })
})
