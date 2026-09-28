import { describe, expect, it } from 'vitest'
import { createMoleGame, isGameOver, spawnMole, tick, whack } from './utils'

const fixedRng = (v: number) => () => v

describe('打地鼠逻辑', () => {
  it('创建游戏：默认 9 洞 30 秒', () => {
    const s = createMoleGame()
    expect(s.holes).toHaveLength(9)
    expect(s.holes.every((h) => !h)).toBe(true)
    expect(s.score).toBe(0)
    expect(s.timeLeft).toBe(30)
  })

  it('创建游戏：非法洞数/时长抛中文错', () => {
    expect(() => createMoleGame(0)).toThrow('洞数必须为正整数')
    expect(() => createMoleGame(1.5)).toThrow('洞数必须为正整数')
    expect(() => createMoleGame(9, 0)).toThrow('时长必须为正整数秒')
    expect(() => createMoleGame(9, -3)).toThrow('时长必须为正整数秒')
  })

  it('spawnMole：按 rng 在指定洞冒出地鼠', () => {
    const s = spawnMole(createMoleGame(4), fixedRng(0.6))
    expect(s.holes).toEqual([false, false, true, false])
  })

  it('whack：命中得分并收回地鼠', () => {
    const s0 = spawnMole(createMoleGame(4), fixedRng(0.6))
    const { state, hit } = whack(s0, 2)
    expect(hit).toBe(true)
    expect(state.score).toBe(1)
    expect(state.holes[2]).toBe(false)
  })

  it('whack：打空洞不得分', () => {
    const s0 = createMoleGame(4)
    const { state, hit } = whack(s0, 1)
    expect(hit).toBe(false)
    expect(state.score).toBe(0)
  })

  it('whack：洞编号非法抛中文错', () => {
    const s = createMoleGame(4)
    expect(() => whack(s, -1)).toThrow('洞编号越界')
    expect(() => whack(s, 4)).toThrow('洞编号越界')
    expect(() => whack(s, 1.5)).toThrow('洞编号越界')
  })

  it('tick：时间递减，归零时收回地鼠并结束', () => {
    const s0 = spawnMole({ holes: [true, false], score: 2, timeLeft: 2 }, fixedRng(0))
    const s1 = tick(s0)
    expect(s1.timeLeft).toBe(1)
    expect(s1.holes).toEqual([true, false])
    expect(isGameOver(s1)).toBe(false)
    const s2 = tick(s1)
    expect(s2.timeLeft).toBe(0)
    expect(s2.holes).toEqual([false, false])
    expect(isGameOver(s2)).toBe(true)
  })

  it('tick：已归零不再变负', () => {
    const s = tick({ holes: [false], score: 0, timeLeft: 0 })
    expect(s.timeLeft).toBe(0)
  })
})
