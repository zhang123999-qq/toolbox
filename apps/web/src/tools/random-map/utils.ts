/**
 * random-map —— 全局编号 #792
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 随机地图生成：
 * mulberry32 可复现伪随机数发生器（相同种子必得相同序列）；
 * generateMap 生成地形网格（0=水 1=陆地 2=山地）：随机初始化 + 2 轮
 * cellular automata 平滑（水域连通），再按 mountainRate 在陆地上生成山地；
 * mapToAscii ASCII 渲染；countTerrain 地形统计。
 * canvas 渲染只在组件层完成，utils 不触碰 DOM。
 * 无任何运行时依赖。
 */

/** 地形：0=水，1=陆地，2=山地 */
export const WATER = 0
export const LAND = 1
export const MOUNTAIN = 2

export interface MapOptions {
  /** 宽（格数，正整数） */
  w: number
  /** 高（格数，正整数） */
  h: number
  /** 随机种子（整数） */
  seed: number
  /** 初始水域比例（0-1），默认 0.45 */
  waterLevel?: number
  /** 陆地转山地概率（0-1），默认 0.08 */
  mountainRate?: number
}

/** mulberry32：可复现的 PRNG，返回 [0, 1) 随机数 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

export function validateMapOptions(o: MapOptions): void {
  if (typeof o !== 'object' || o === null) throw new Error('参数必须是对象')
  if (!isPositiveInt(o.w)) throw new Error('宽度 w 必须为正整数')
  if (!isPositiveInt(o.h)) throw new Error('高度 h 必须为正整数')
  if (o.w > 256 || o.h > 256) throw new Error('地图尺寸过大（上限 256×256）')
  if (typeof o.seed !== 'number' || !Number.isInteger(o.seed)) throw new Error('种子 seed 必须为整数')
  const waterLevel = o.waterLevel ?? 0.45
  if (typeof waterLevel !== 'number' || waterLevel < 0 || waterLevel > 1) {
    throw new Error('水域比例 waterLevel 必须在 [0, 1] 之间')
  }
  const mountainRate = o.mountainRate ?? 0.08
  if (typeof mountainRate !== 'number' || mountainRate < 0 || mountainRate > 1) {
    throw new Error('山地概率 mountainRate 必须在 [0, 1] 之间')
  }
}

function smooth(grid: number[][], w: number, h: number): number[][] {
  const next: number[][] = []
  for (let y = 0; y < h; y += 1) {
    const row: number[] = []
    for (let x = 0; x < w; x += 1) {
      let water = 0
      let total = 0
      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) {
            continue // 边界外不计入，边缘自动闭合
          }
          total += 1
          if (grid[ny][nx] === WATER) water += 1
        }
      }
      // 相对阈值：水域邻居占比 ≥ 5/9 则为水（边缘格按实际邻居数折算）
      row.push(water * 9 >= 5 * total ? WATER : LAND)
    }
    next.push(row)
  }
  return next
}

export function generateMap(o: MapOptions): number[][] {
  validateMapOptions(o)
  const waterLevel = o.waterLevel ?? 0.45
  const mountainRate = o.mountainRate ?? 0.08
  const rand = mulberry32(o.seed)
  let grid: number[][] = []
  for (let y = 0; y < o.h; y += 1) {
    const row: number[] = []
    for (let x = 0; x < o.w; x += 1) {
      row.push(rand() < waterLevel ? WATER : LAND)
    }
    grid.push(row)
  }
  grid = smooth(grid, o.w, o.h)
  grid = smooth(grid, o.w, o.h)
  for (let y = 0; y < o.h; y += 1) {
    for (let x = 0; x < o.w; x += 1) {
      if (grid[y][x] === LAND && rand() < mountainRate) grid[y][x] = MOUNTAIN
    }
  }
  return grid
}

const TERRAIN_CHARS = ['≈', '·', '▲']

export function mapToAscii(grid: number[][]): string {
  if (!Array.isArray(grid) || grid.length === 0) throw new Error('地图不能为空')
  return grid
    .map((row, y) => {
      if (!Array.isArray(row)) throw new Error(`第 ${y} 行不是数组`)
      return row
        .map((t) => {
          if (t !== WATER && t !== LAND && t !== MOUNTAIN) throw new Error(`非法地形值：${String(t)}`)
          return TERRAIN_CHARS[t]
        })
        .join('')
    })
    .join('\n')
}

export function countTerrain(grid: number[][]): { water: number; land: number; mountain: number } {
  const counts = { water: 0, land: 0, mountain: 0 }
  for (const row of grid) {
    for (const t of row) {
      if (t === WATER) counts.water += 1
      else if (t === LAND) counts.land += 1
      else if (t === MOUNTAIN) counts.mountain += 1
      else throw new Error(`非法地形值：${String(t)}`)
    }
  }
  return counts
}

export function parseMapOptions(text: string): MapOptions {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new Error('输入必须是 JSON 对象')
  const o = raw as Record<string, unknown>
  const opts: MapOptions = {
    w: o.w as number,
    h: o.h as number,
    seed: o.seed as number,
    waterLevel: o.waterLevel as number | undefined,
    mountainRate: o.mountainRate as number | undefined,
  }
  validateMapOptions(opts)
  return opts
}
