import { describe, expect, it } from 'vitest'
import { aiMove, BOARD_SIZE, checkWin, createBoard, isFull, placeStone } from './utils'

const rng0 = () => 0

describe('五子棋逻辑', () => {
  it('创建：默认 15×15 全空', () => {
    const b = createBoard()
    expect(b.length).toBe(BOARD_SIZE)
    expect(b.every((r) => r.length === BOARD_SIZE && r.every((c) => c === 0))).toBe(true)
  })

  it('创建：非法尺寸抛中文错', () => {
    expect(() => createBoard(4)).toThrow('棋盘尺寸至少为 5')
    expect(() => createBoard(4.5)).toThrow('棋盘尺寸至少为 5')
  })

  it('placeStone：落子返回新棋盘，原棋盘不变', () => {
    const b = createBoard()
    const b2 = placeStone(b, 7, 7, 1)
    expect(b2[7][7]).toBe(1)
    expect(b[7][7]).toBe(0)
  })

  it('placeStone：越界/非法颜色/占用抛中文错', () => {
    const b = createBoard()
    expect(() => placeStone(b, -1, 0, 1)).toThrow('落子位置超出棋盘')
    expect(() => placeStone(b, 15, 0, 1)).toThrow('落子位置超出棋盘')
    expect(() => placeStone(b, 0, 0, 3 as never)).toThrow('棋子颜色必须为黑或白')
    const b2 = placeStone(b, 3, 3, 1)
    expect(() => placeStone(b2, 3, 3, 2)).toThrow('该位置已有棋子')
  })

  it('checkWin：横向五连获胜', () => {
    let b = createBoard()
    for (let x = 3; x <= 7; x++) b = placeStone(b, x, 7, 1)
    expect(checkWin(b, 7, 7)).toBe(true)
    expect(checkWin(b, 3, 7)).toBe(true)
  })

  it('checkWin：纵向五连获胜', () => {
    let b = createBoard()
    for (let y = 0; y <= 4; y++) b = placeStone(b, 5, y, 2)
    expect(checkWin(b, 5, 4)).toBe(true)
  })

  it('checkWin：斜向五连获胜', () => {
    let b = createBoard()
    for (let i = 0; i < 5; i++) b = placeStone(b, i, i, 1)
    expect(checkWin(b, 4, 4)).toBe(true)
    let c = createBoard()
    for (let i = 0; i < 5; i++) c = placeStone(c, i, 4 - i, 2)
    expect(checkWin(c, 4, 0)).toBe(true)
  })

  it('checkWin：四连不算胜、空位不算胜', () => {
    let b = createBoard()
    for (let x = 0; x < 4; x++) b = placeStone(b, x, 0, 1)
    expect(checkWin(b, 3, 0)).toBe(false)
    expect(checkWin(b, 5, 0)).toBe(false)
  })

  it('isFull：空棋盘不满、全满棋盘为满', () => {
    expect(isFull(createBoard())).toBe(false)
    let b = createBoard(5)
    for (let y = 0; y < 5; y++)
      for (let x = 0; x < 5; x++) b = placeStone(b, x, y, (((x + y) % 2) + 1) as 1 | 2)
    expect(isFull(b)).toBe(true)
  })

  it('aiMove：有成五机会时直接取胜', () => {
    let b = createBoard()
    for (let x = 0; x < 4; x++) b = placeStone(b, x, 0, 2)
    const m = aiMove(b, rng0)
    expect(m).toEqual({ x: 4, y: 0 })
  })

  it('aiMove：无取胜时优先堵住黑方四连', () => {
    let b = createBoard()
    for (let x = 0; x < 4; x++) b = placeStone(b, x, 1, 1)
    const m = aiMove(b, rng0)
    expect(m).toEqual({ x: 4, y: 1 })
  })

  it('aiMove：无攻防时随机落子（rng 可注入）', () => {
    const b = createBoard()
    const m = aiMove(b, rng0)
    expect(m).toEqual({ x: 0, y: 0 })
    expect(b[m.y][m.x]).toBe(0)
  })

  it('aiMove：棋盘已满抛中文错', () => {
    const b = createBoard(5)
    for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) b[y][x] = 1
    expect(() => aiMove(b, rng0)).toThrow('棋盘已满，无可落子位置')
  })
})
