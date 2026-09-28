/**
 * vision —— 眼力测试的纯函数层
 *
 * 色块阵生成、难度曲线均为纯函数；rng 可注入，便于确定性测试。
 */

/** 一轮眼力测试 */
export interface VisionRound {
  level: number
  /** 网格边长（grid×grid） */
  grid: number
  /** 色差块下标 */
  oddIndex: number
  /** 基准色（CSS 颜色） */
  base: string
  /** 色差块颜色（CSS 颜色） */
  odd: string
}

/**
 * 难度曲线：等级越高网格越大、色差越小。
 * 网格边长 3→8 封顶；色差（明度差）60→12 保底。
 */
export function levelConfig(level: number): { grid: number; delta: number } {
  if (!Number.isInteger(level) || level < 1) {
    throw new Error('等级必须为正整数')
  }
  const grid = Math.min(3 + Math.floor((level - 1) / 2), 8)
  const delta = Math.max(60 - (level - 1) * 8, 12)
  return { grid, delta }
}

/** 生成一轮测试：n×n 色块中随机一块色差 */
export function newRound(level: number, rng: () => number = Math.random): VisionRound {
  const { grid, delta } = levelConfig(level)
  const total = grid * grid
  const oddIndex = Math.floor(rng() * total)
  const hue = Math.floor(rng() * 360)
  const base = `hsl(${hue}, 70%, 55%)`
  const odd = `hsl(${hue}, 70%, ${55 - delta / 2}%)`
  return { level, grid, oddIndex, base, odd }
}

/** 判断点击是否命中色差块 */
export function checkAnswer(round: VisionRound, idx: number): boolean {
  return idx === round.oddIndex
}
