import { describe, expect, it } from 'vitest'
import { isSolvable, isSolved, moveTile, newPuzzle, solvedTiles, type PuzzleState } from './utils'

describe('数字华容道逻辑', () => {
  it('solvedTiles：目标排列', () => {
    expect(solvedTiles(3)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0])
  })

  it('newPuzzle：同一种子打乱相同、步数为 0', () => {
    const a = newPuzzle(4, 123)
    const b = newPuzzle(4, 123)
    expect(a.tiles).toEqual(b.tiles)
    expect(a.moves).toBe(0)
    expect(a.size).toBe(4)
    // 打乱后大概率不是目标态，且必为目标态的排列
    expect([...a.tiles].sort((x, y) => x - y)).toEqual([...solvedTiles(4)].sort((x, y) => x - y))
  })

  it('newPuzzle：打乱结果可解', () => {
    for (const size of [2, 3, 4, 5]) {
      const p = newPuzzle(size, size * 1000 + 7)
      expect(isSolvable(p.tiles, size)).toBe(true)
    }
  })

  it('newPuzzle：非法尺寸抛中文错', () => {
    expect(() => newPuzzle(1)).toThrow('尺寸必须为 2-6 的整数')
    expect(() => newPuzzle(7)).toThrow('尺寸必须为 2-6 的整数')
    expect(() => newPuzzle(3.5)).toThrow('尺寸必须为 2-6 的整数')
  })

  it('moveTile：相邻数字滑入空格并计步', () => {
    const s: PuzzleState = { size: 3, tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8], moves: 0 }
    const next = moveTile(s, 8)
    expect(next.tiles).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 0])
    expect(next.moves).toBe(1)
    expect(s.moves).toBe(0)
    expect(isSolved(next)).toBe(true)
  })

  it('moveTile：不相邻数字原样返回', () => {
    const s: PuzzleState = { size: 3, tiles: [1, 2, 3, 4, 5, 6, 7, 0, 8], moves: 2 }
    const next = moveTile(s, 1)
    expect(next).toBe(s)
  })

  it('moveTile：不存在的数字/空格抛中文错', () => {
    const s: PuzzleState = { size: 3, tiles: solvedTiles(3), moves: 0 }
    expect(() => moveTile(s, 99)).toThrow('棋盘上没有该数字')
    expect(() => moveTile(s, 0)).toThrow('不能移动空格')
  })

  it('isSolved：未复原返回 false', () => {
    const s: PuzzleState = { size: 3, tiles: [1, 2, 3, 4, 5, 6, 0, 7, 8], moves: 0 }
    expect(isSolved(s)).toBe(false)
    const s2: PuzzleState = { size: 3, tiles: [1, 2, 3, 4, 5, 6, 7, 8, 1], moves: 0 }
    expect(isSolved(s2)).toBe(false)
  })

  it('isSolvable：奇数宽逆序偶数可解', () => {
    expect(isSolvable(solvedTiles(3), 3)).toBe(true)
    // 交换 7、8：逆序数 1 → 不可解
    expect(isSolvable([1, 2, 3, 4, 5, 6, 8, 7, 0], 3)).toBe(false)
  })

  it('isSolvable：偶数宽按行列规则判定', () => {
    expect(isSolvable(solvedTiles(4), 4)).toBe(true)
    // 交换 14、15：逆序数 1，空格在底行 → 不可解
    const bad = solvedTiles(4)
    const t = bad[13]
    bad[13] = bad[14]
    bad[14] = t
    expect(isSolvable(bad, 4)).toBe(false)
    // 空格上移一行后再交换 14、15：逆序数 4，空格倒数第 2 行 → (4+2) 偶数 → 不可解
    const up = solvedTiles(4)
    up[11] = 0
    up[15] = 12
    const u = up[13]
    up[13] = up[14]
    up[14] = u
    expect(isSolvable(up, 4)).toBe(false)
  })
})
