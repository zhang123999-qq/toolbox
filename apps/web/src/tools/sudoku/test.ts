import { describe, expect, it } from 'vitest'
import {
  countSolutions,
  digCell,
  genPuzzle,
  isValid,
  mulberry32,
  solve,
  type SudokuBoard,
} from './utils'

const PUZZLE: SudokuBoard = [
  [5, 3, 0, 0, 7, 0, 0, 0, 0],
  [6, 0, 0, 1, 9, 5, 0, 0, 0],
  [0, 9, 8, 0, 0, 0, 0, 6, 0],
  [8, 0, 0, 0, 6, 0, 0, 0, 3],
  [4, 0, 0, 8, 0, 3, 0, 0, 1],
  [7, 0, 0, 0, 2, 0, 0, 0, 6],
  [0, 6, 0, 0, 0, 0, 2, 8, 0],
  [0, 0, 0, 4, 1, 9, 0, 0, 5],
  [0, 0, 0, 0, 8, 0, 0, 7, 9],
]

const SOLUTION: SudokuBoard = [
  [5, 3, 4, 6, 7, 8, 9, 1, 2],
  [6, 7, 2, 1, 9, 5, 3, 4, 8],
  [1, 9, 8, 3, 4, 2, 5, 6, 7],
  [8, 5, 9, 7, 6, 1, 4, 2, 3],
  [4, 2, 6, 8, 5, 3, 7, 9, 1],
  [7, 1, 3, 9, 2, 4, 8, 5, 6],
  [9, 6, 1, 5, 3, 7, 2, 8, 4],
  [2, 8, 7, 4, 1, 9, 6, 3, 5],
  [3, 4, 5, 2, 8, 6, 1, 7, 9],
]

describe('数独逻辑', () => {
  it('isValid：合法棋盘通过', () => {
    expect(isValid(PUZZLE)).toBe(true)
    expect(isValid(SOLUTION)).toBe(true)
  })

  it('isValid：行/列/宫冲突返回 false', () => {
    const rowDup = SOLUTION.map((r) => [...r])
    rowDup[0][1] = 5
    expect(isValid(rowDup)).toBe(false)
    const colDup = SOLUTION.map((r) => [...r])
    colDup[1][0] = 5
    expect(isValid(colDup)).toBe(false)
    const boxDup = PUZZLE.map((r) => [...r])
    boxDup[1][1] = 8 // 宫内与 [2][2] 的 8 冲突，行列均无冲突
    expect(isValid(boxDup)).toBe(false)
  })

  it('isValid：非法尺寸抛中文错', () => {
    expect(() => isValid([[1]])).toThrow('数独棋盘必须为 9x9')
    expect(() => isValid(Array.from({ length: 9 }, () => [1]))).toThrow('数独棋盘必须为 9x9')
  })

  it('solve：解出经典题目', () => {
    expect(solve(PUZZLE)).toEqual(SOLUTION)
  })

  it('solve：已填满的合法棋盘直接返回', () => {
    expect(solve(SOLUTION)).toEqual(SOLUTION)
  })

  it('solve：输入冲突返回 null', () => {
    const bad = SOLUTION.map((r) => [...r])
    bad[0][0] = 1
    bad[0][1] = 1
    expect(solve(bad)).toBeNull()
  })

  it('solve：合法但无解的棋盘返回 null（死路分支）', () => {
    const dead: SudokuBoard = Array.from({ length: 9 }, () => Array(9).fill(0))
    dead[0] = [0, 1, 2, 3, 4, 5, 6, 7, 8]
    dead[1][0] = 9
    expect(isValid(dead)).toBe(true)
    expect(solve(dead)).toBeNull()
  })

  it('solve：需回溯的死路返回 null（覆盖回溯分支）', () => {
    // (0,0) 与 (0,1) 候选均为 {1}，先放 (0,0)=1 后 (0,1) 无候选 → 回溯 → 无解
    const tricky: SudokuBoard = [
      [0, 0, 2, 3, 4, 5, 6, 7, 8],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 9, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0, 0],
    ]
    expect(isValid(tricky)).toBe(true)
    expect(solve(tricky)).toBeNull()
  })

  it('digCell：挖去完整终盘一格仍唯一解，不修改输入', () => {
    const { solution } = genPuzzle('easy', 42)
    const next = digCell(solution, 0, 0)
    expect(next).not.toBeNull()
    expect(next![0][0]).toBe(0)
    expect(solution[0][0]).not.toBe(0)
  })

  it('digCell：空格返回 null', () => {
    const { puzzle } = genPuzzle('easy', 42)
    let found = false
    for (let y = 0; y < 9 && !found; y++) {
      for (let x = 0; x < 9 && !found; x++) {
        if (puzzle[y][x] === 0) {
          expect(digCell(puzzle, x, y)).toBeNull()
          found = true
        }
      }
    }
    expect(found).toBe(true)
  })

  it('digCell：挖去关键格破坏唯一解时返回 null（恢复原样）', () => {
    const { puzzle } = genPuzzle('hard', 1)
    expect(puzzle[0][0]).not.toBe(0)
    expect(digCell(puzzle, 0, 0)).toBeNull()
    expect(puzzle[0][0]).not.toBe(0)
  })

  it('countSolutions：经典题目唯一解', () => {
    expect(countSolutions(PUZZLE, 2)).toBe(1)
  })

  it('countSolutions：空棋盘多解且提前退出', () => {
    const empty: SudokuBoard = Array.from({ length: 9 }, () => Array(9).fill(0))
    expect(countSolutions(empty, 2)).toBe(2)
    expect(countSolutions(empty, 1)).toBe(1)
  })

  it('countSolutions：非法上限抛中文错', () => {
    expect(() => countSolutions(PUZZLE, 0)).toThrow('上限至少为 1')
    expect(() => countSolutions(PUZZLE, 1.5)).toThrow('上限至少为 1')
  })

  it('genPuzzle：同一种子生成相同题目且唯一解', () => {
    const a = genPuzzle('easy', 42)
    const b = genPuzzle('easy', 42)
    expect(a.puzzle).toEqual(b.puzzle)
    expect(a.solution).toEqual(b.solution)
    expect(isValid(a.solution)).toBe(true)
    expect(countSolutions(a.puzzle, 2)).toBe(1)
    // 题目是解的挖空：非空格与解一致
    for (let y = 0; y < 9; y++) {
      for (let x = 0; x < 9; x++) {
        if (a.puzzle[y][x] !== 0) expect(a.puzzle[y][x]).toBe(a.solution[y][x])
      }
    }
  })

  it('genPuzzle：非法难度抛中文错', () => {
    expect(() => genPuzzle('impossible' as never, 1)).toThrow('难度必须为 easy/medium/hard')
  })

  it('mulberry32：同一种子序列相同', () => {
    const r1 = mulberry32(7)
    const r2 = mulberry32(7)
    expect([r1(), r1(), r1()]).toEqual([r2(), r2(), r2()])
  })
})
