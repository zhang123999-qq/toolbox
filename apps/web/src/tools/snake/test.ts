import { describe, expect, it } from 'vitest'
import {
  changeDirection,
  createSnake,
  isCollision,
  moveSnake,
  spawnFood,
  type SnakeState,
} from './utils'

const rng0 = () => 0

describe('贪吃蛇逻辑', () => {
  it('创建：蛇在中央、方向向右、食物不在蛇身上', () => {
    const s = createSnake(10, 10, rng0)
    expect(s.snake).toEqual([[5, 5]])
    expect(s.dir).toBe('right')
    expect(s.alive).toBe(true)
    expect(s.score).toBe(0)
    expect(s.food).not.toEqual([5, 5])
  })

  it('创建：非法尺寸抛中文错', () => {
    expect(() => createSnake(3, 10)).toThrow('棋盘尺寸至少为 4x4')
    expect(() => createSnake(10, 3)).toThrow('棋盘尺寸至少为 4x4')
    expect(() => createSnake(4.5, 10)).toThrow('棋盘尺寸至少为 4x4')
  })

  it('changeDirection：允许转向，禁止 180° 反向', () => {
    const s = createSnake(10, 10, rng0)
    expect(changeDirection(s, 'up').dir).toBe('up')
    expect(changeDirection(s, 'left').dir).toBe('right')
    expect(changeDirection(s, 'down').dir).toBe('down')
  })

  it('moveSnake：向前移动一格', () => {
    const s = createSnake(10, 10, rng0)
    const n = moveSnake({ ...s, food: [0, 0] }, rng0)
    expect(n.snake).toEqual([[6, 5]])
    expect(n.alive).toBe(true)
    expect(n.score).toBe(0)
  })

  it('moveSnake：吃到食物变长加分并重新布食', () => {
    const s = createSnake(10, 10, rng0)
    const n = moveSnake({ ...s, food: [6, 5] }, rng0)
    expect(n.snake).toEqual([
      [6, 5],
      [5, 5],
    ])
    expect(n.score).toBe(1)
    expect(n.food).not.toEqual([6, 5])
  })

  it('moveSnake：撞墙死亡', () => {
    const s: SnakeState = {
      snake: [[9, 5]],
      dir: 'right',
      food: [0, 0],
      w: 10,
      h: 10,
      alive: true,
      score: 0,
    }
    const n = moveSnake(s, rng0)
    expect(n.alive).toBe(false)
  })

  it('moveSnake：撞到自身死亡', () => {
    const s: SnakeState = {
      snake: [
        [5, 5],
        [5, 6],
        [4, 6],
        [4, 5],
        [3, 5],
      ],
      dir: 'down',
      food: [0, 0],
      w: 10,
      h: 10,
      alive: true,
      score: 0,
    }
    const n = moveSnake(s, rng0)
    expect(n.alive).toBe(false)
  })

  it('moveSnake：钻进自己让开的尾巴不算撞', () => {
    const s: SnakeState = {
      snake: [
        [5, 5],
        [4, 5],
      ],
      dir: 'down',
      food: [0, 0],
      w: 10,
      h: 10,
      alive: true,
      score: 0,
    }
    // 先向下再向左再向上，头部进入原尾巴位置
    const s1 = moveSnake(changeDirection(s, 'down'), rng0)
    const s2 = moveSnake(changeDirection(s1, 'left'), rng0)
    const s3 = moveSnake(changeDirection(s2, 'up'), rng0)
    expect(s3.alive).toBe(true)
    expect(s3.snake[0]).toEqual([4, 5])
  })

  it('moveSnake：已死亡则保持不动', () => {
    const s: SnakeState = {
      snake: [[5, 5]],
      dir: 'right',
      food: [0, 0],
      w: 10,
      h: 10,
      alive: false,
      score: 3,
    }
    expect(moveSnake(s, rng0)).toBe(s)
  })

  it('isCollision：撞墙/撞身/正常三种情况', () => {
    const base = createSnake(10, 10, rng0)
    expect(isCollision({ ...base, snake: [[-1, 5]] })).toBe(true)
    expect(isCollision({ ...base, snake: [[10, 5]] })).toBe(true)
    expect(isCollision({ ...base, snake: [[5, -1]] })).toBe(true)
    expect(isCollision({ ...base, snake: [[5, 10]] })).toBe(true)
    expect(
      isCollision({
        ...base,
        snake: [
          [5, 5],
          [5, 6],
          [5, 5],
        ],
      }),
    ).toBe(true)
    expect(isCollision(base)).toBe(false)
  })

  it('spawnFood：食物不在蛇身上；棋盘填满时返回 [-1,-1]', () => {
    const s = createSnake(4, 4, rng0)
    const n = spawnFood(s, rng0)
    expect(n.food[0]).toBeGreaterThanOrEqual(0)
    const full: SnakeState = {
      snake: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [0, 1],
        [1, 1],
        [2, 1],
        [3, 1],
        [0, 2],
        [1, 2],
        [2, 2],
        [3, 2],
        [0, 3],
        [1, 3],
        [2, 3],
        [3, 3],
      ],
      dir: 'right',
      food: [0, 0],
      w: 4,
      h: 4,
      alive: true,
      score: 0,
    }
    expect(spawnFood(full, rng0).food).toEqual([-1, -1])
  })
})
