import { describe, expect, it } from 'vitest'
import {
  checkWin,
  countFlags,
  genBoard,
  mulberry32,
  reveal,
  toggleFlag,
  type MsBoard,
} from './utils'

describe('扫雷逻辑', () => {
  /** 手工构造棋盘：mines 为地雷坐标列表 */
  function makeBoard(w: number, h: number, mines: Array<[number, number]>) {
    const b: MsBoard = Array.from({ length: h }, (_y) =>
      Array.from({ length: w }, (_x) => ({
        mine: false,
        revealed: false,
        flagged: false,
        adjacent: 0,
      })),
    )
    for (const [x, y] of mines) b[y][x].mine = true
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let n = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && ny >= 0 && nx < w && ny < h && b[ny][nx].mine) n++
          }
        }
        b[y][x].adjacent = n
      }
    }
    return b
  }

  it('mulberry32：同一种子序列相同', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    const c = mulberry32(43)
    expect(c()).not.toBe(a())
  })

  it('genBoard：地雷数正确且可复现', () => {
    const b1 = genBoard(9, 9, 10, 123)
    const b2 = genBoard(9, 9, 10, 123)
    const mines = b1.flat().filter((c) => c.mine).length
    expect(mines).toBe(10)
    expect(JSON.stringify(b1)).toBe(JSON.stringify(b2))
  })

  it('genBoard：非法参数抛中文错', () => {
    expect(() => genBoard(1, 9, 10)).toThrow('棋盘至少为 2x2')
    expect(() => genBoard(2.5, 9, 10)).toThrow('棋盘至少为 2x2')
    expect(() => genBoard(9, 1, 10)).toThrow('棋盘至少为 2x2')
    expect(() => genBoard(9, 9, 0)).toThrow('地雷数须在 1 到格子总数减一之间')
    expect(() => genBoard(9, 9, 81)).toThrow('地雷数须在 1 到格子总数减一之间')
    expect(() => genBoard(9, 9, 1.5)).toThrow('地雷数须在 1 到格子总数减一之间')
  })

  it('genBoard：adjacent 计数正确', () => {
    // 固定种子找一个已知布局验证相邻数一致性
    const b = genBoard(4, 4, 3, 7)
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        let expectN = 0
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue
            const nx = x + dx
            const ny = y + dy
            if (nx >= 0 && ny >= 0 && nx < 4 && ny < 4 && b[ny][nx].mine) expectN++
          }
        }
        expect(b[y][x].adjacent).toBe(expectN)
      }
    }
  })

  it('reveal：踩雷返回 hitMine', () => {
    const b = genBoard(4, 4, 1, 7)
    const mine = b.flatMap((row, y) => row.map((c, x) => ({ c, x, y }))).find((p) => p.c.mine)!
    const { board, hitMine } = reveal(b, mine.x, mine.y)
    expect(hitMine).toBe(true)
    expect(board[mine.y][mine.x].revealed).toBe(true)
  })

  it('reveal：空白格泛洪展开（手工棋盘，确定性）', () => {
    const b = makeBoard(4, 4, [[0, 0]])
    // 把 (1,1) 插旗：泛洪时应跳过
    const flagged = toggleFlag(b, 1, 1)
    const { board, hitMine } = reveal(flagged, 3, 3)
    expect(hitMine).toBe(false)
    expect(board[3][3].revealed).toBe(true)
    // 地雷格未被展开
    expect(board[0][0].revealed).toBe(false)
    // 被旗帜保护的格子未被展开
    expect(board[1][1].revealed).toBe(false)
    expect(board[1][1].flagged).toBe(true)
    // 远离地雷的空白区都被展开
    expect(board[3][0].revealed).toBe(true)
  })

  it('reveal：越界抛中文错；已揭开/已插旗不再处理', () => {
    const b = genBoard(4, 4, 2, 9)
    expect(() => reveal(b, -1, 0)).toThrow('坐标越界')
    expect(() => reveal(b, 4, 0)).toThrow('坐标越界')
    const safe = b.flatMap((row, y) => row.map((c, x) => ({ c, x, y }))).find((p) => !p.c.mine)!
    const r1 = reveal(b, safe.x, safe.y)
    const r2 = reveal(r1.board, safe.x, safe.y)
    expect(r2.hitMine).toBe(false)
    expect(r2.board[safe.y][safe.x].revealed).toBe(true)
    const f = toggleFlag(b, safe.x, safe.y)
    const r3 = reveal(f, safe.x, safe.y)
    expect(r3.board[safe.y][safe.x].revealed).toBe(false)
  })

  it('toggleFlag：切换旗帜；已揭开格子不受影响；越界抛错', () => {
    const b = genBoard(4, 4, 2, 9)
    const f1 = toggleFlag(b, 0, 0)
    expect(f1[0][0].flagged).toBe(true)
    const f2 = toggleFlag(f1, 0, 0)
    expect(f2[0][0].flagged).toBe(false)
    expect(countFlags(f1)).toBe(1)
    expect(countFlags(f2)).toBe(0)
    const safe = b.flatMap((row, y) => row.map((c, x) => ({ c, x, y }))).find((p) => !p.c.mine)!
    const r = reveal(b, safe.x, safe.y)
    const f3 = toggleFlag(r.board, safe.x, safe.y)
    expect(f3[safe.y][safe.x].flagged).toBe(false)
    expect(() => toggleFlag(b, 9, 9)).toThrow('坐标越界')
  })

  it('checkWin：揭开全部安全格即胜利', () => {
    const b = genBoard(3, 3, 1, 5)
    let cur: MsBoard = b
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 3; x++) {
        if (!cur[y][x].mine) cur = reveal(cur, x, y).board
      }
    }
    expect(checkWin(cur)).toBe(true)
    expect(checkWin(b)).toBe(false)
  })
})
