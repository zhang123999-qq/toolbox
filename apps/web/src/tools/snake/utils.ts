/** 贪吃蛇：网格逻辑纯函数（不可变状态） */

export type Direction = 'up' | 'down' | 'left' | 'right'
export type Point = [number, number]

export interface SnakeState {
  /** 蛇身，[0] 为蛇头 */
  snake: Point[]
  dir: Direction
  food: Point
  w: number
  h: number
  alive: boolean
  score: number
}

export type SnakeRng = () => number

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}
const DELTA: Record<Direction, Point> = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }

function pickFood(state: SnakeState, rng: SnakeRng): Point {
  const occupied = new Set(state.snake.map(([x, y]) => `${x},${y}`))
  const free: Point[] = []
  for (let y = 0; y < state.h; y++) {
    for (let x = 0; x < state.w; x++) {
      if (!occupied.has(`${x},${y}`)) free.push([x, y])
    }
  }
  if (free.length === 0) return [-1, -1]
  return free[Math.floor(rng() * free.length)]
}

export function createSnake(w = 20, h = 20, rng: SnakeRng = Math.random): SnakeState {
  if (!Number.isInteger(w) || w < 4 || !Number.isInteger(h) || h < 4) {
    throw new Error('棋盘尺寸至少为 4x4')
  }
  const mid: Point = [Math.floor(w / 2), Math.floor(h / 2)]
  const base: SnakeState = {
    snake: [mid],
    dir: 'right',
    food: [-1, -1],
    w,
    h,
    alive: true,
    score: 0,
  }
  return { ...base, food: pickFood(base, rng) }
}

/** 随机放置食物（纯函数） */
export function spawnFood(state: SnakeState, rng: SnakeRng = Math.random): SnakeState {
  return { ...state, food: pickFood(state, rng) }
}

/** 改变方向：禁止 180° 反向 */
export function changeDirection(state: SnakeState, dir: Direction): SnakeState {
  if (dir === OPPOSITE[state.dir]) return state
  return { ...state, dir }
}

/** 当前蛇头是否撞墙或撞到自身 */
export function isCollision(state: SnakeState): boolean {
  const [hx, hy] = state.snake[0]
  if (hx < 0 || hy < 0 || hx >= state.w || hy >= state.h) return true
  return state.snake.slice(1).some(([x, y]) => x === hx && y === hy)
}

/** 前进一步：吃到食物则变长加分，撞到则死亡 */
export function moveSnake(state: SnakeState, rng: SnakeRng = Math.random): SnakeState {
  if (!state.alive) return state
  const [dx, dy] = DELTA[state.dir]
  const [hx, hy] = state.snake[0]
  const head: Point = [hx + dx, hy + dy]
  const eats = head[0] === state.food[0] && head[1] === state.food[1]
  // 未变长时尾部会让开，因此先去掉尾巴再做碰撞探测
  const body = eats ? state.snake : state.snake.slice(0, -1)
  if (isCollision({ ...state, snake: [head, ...body] })) {
    return { ...state, alive: false }
  }
  const next: SnakeState = {
    ...state,
    snake: [head, ...body],
    score: eats ? state.score + 1 : state.score,
  }
  return eats ? { ...next, food: pickFood(next, rng) } : next
}
