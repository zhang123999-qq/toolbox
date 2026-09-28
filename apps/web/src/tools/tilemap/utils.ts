/**
 * tilemap —— 全局编号 #788
 * 域：game（游戏开发）｜大组：design｜优先级：P2｜可行性：A｜模板：T3
 *
 * 瓦片地图编辑器：
 * createTilemap 创建空地图；validateTilemap 校验结构（中文报错）；
 * setTile / fillRect 返回新地图（不可变更新，便于撤销）；
 * resizeTilemap 缩放保留重叠区域；
 * exportTilemapJson / importTilemapJson 序列化；
 * renderTilemapText ASCII 文本渲染。
 * canvas 渲染只在组件层完成，utils 不触碰 DOM。
 * 无任何运行时依赖。
 */

export interface Tilemap {
  /** 列数 */
  cols: number
  /** 行数 */
  rows: number
  /** 瓦片边长（px） */
  tileSize: number
  /** 图层：layers[l][y][x] = 瓦片 id（0 = 空） */
  layers: number[][][]
}

function isPositiveInt(n: unknown): n is number {
  return typeof n === 'number' && Number.isInteger(n) && n > 0
}

export function createTilemap(cols: number, rows: number, tileSize = 32, layerCount = 1): Tilemap {
  if (!isPositiveInt(cols)) throw new Error('列数 cols 必须为正整数')
  if (!isPositiveInt(rows)) throw new Error('行数 rows 必须为正整数')
  if (!isPositiveInt(tileSize)) throw new Error('瓦片尺寸 tileSize 必须为正整数')
  if (!isPositiveInt(layerCount)) throw new Error('图层数 layerCount 必须为正整数')
  const layers: number[][][] = []
  for (let l = 0; l < layerCount; l += 1) {
    const layer: number[][] = []
    for (let y = 0; y < rows; y += 1) layer.push(new Array<number>(cols).fill(0))
    layers.push(layer)
  }
  return { cols, rows, tileSize, layers }
}

export function validateTilemap(map: Tilemap): void {
  if (typeof map !== 'object' || map === null) throw new Error('地图必须是对象')
  if (!isPositiveInt(map.cols)) throw new Error('列数 cols 必须为正整数')
  if (!isPositiveInt(map.rows)) throw new Error('行数 rows 必须为正整数')
  if (!isPositiveInt(map.tileSize)) throw new Error('瓦片尺寸 tileSize 必须为正整数')
  if (!Array.isArray(map.layers) || map.layers.length === 0) throw new Error('至少需要 1 个图层')
  map.layers.forEach((layer, li) => {
    if (!Array.isArray(layer) || layer.length !== map.rows) {
      throw new Error(`图层 ${li} 行数应为 ${map.rows}`)
    }
    layer.forEach((row, y) => {
      if (!Array.isArray(row) || row.length !== map.cols) {
        throw new Error(`图层 ${li} 第 ${y} 行列数应为 ${map.cols}`)
      }
      row.forEach((tile, x) => {
        if (!Number.isInteger(tile) || tile < 0) {
          throw new Error(`图层 ${li} (${x},${y}) 的瓦片 id 必须为非负整数`)
        }
      })
    })
  })
}

function checkBounds(map: Tilemap, layer: number, x: number, y: number): void {
  if (!Number.isInteger(layer) || layer < 0 || layer >= map.layers.length) {
    throw new Error(`图层索引 ${layer} 越界（0-${map.layers.length - 1}）`)
  }
  if (!Number.isInteger(x) || x < 0 || x >= map.cols) throw new Error(`x 坐标 ${x} 越界（0-${map.cols - 1}）`)
  if (!Number.isInteger(y) || y < 0 || y >= map.rows) throw new Error(`y 坐标 ${y} 越界（0-${map.rows - 1}）`)
}

function cloneLayers(layers: number[][][]): number[][][] {
  return layers.map((layer) => layer.map((row) => [...row]))
}

/** 设置单个瓦片（返回新地图，原地图不变） */
export function setTile(map: Tilemap, layer: number, x: number, y: number, tile: number): Tilemap {
  validateTilemap(map)
  checkBounds(map, layer, x, y)
  if (!Number.isInteger(tile) || tile < 0) throw new Error('瓦片 id 必须为非负整数')
  const layers = cloneLayers(map.layers)
  layers[layer][y][x] = tile
  return { ...map, layers }
}

/** 矩形区域填充（返回新地图，坐标自动归一化并裁剪到地图内） */
export function fillRect(
  map: Tilemap,
  layer: number,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  tile: number,
): Tilemap {
  validateTilemap(map)
  if (!Number.isInteger(layer) || layer < 0 || layer >= map.layers.length) {
    throw new Error(`图层索引 ${layer} 越界（0-${map.layers.length - 1}）`)
  }
  if (!Number.isInteger(tile) || tile < 0) throw new Error('瓦片 id 必须为非负整数')
  const xa = Math.max(0, Math.min(x0, x1))
  const xb = Math.min(map.cols - 1, Math.max(x0, x1))
  const ya = Math.max(0, Math.min(y0, y1))
  const yb = Math.min(map.rows - 1, Math.max(y0, y1))
  const layers = cloneLayers(map.layers)
  for (let y = ya; y <= yb; y += 1) {
    for (let x = xa; x <= xb; x += 1) layers[layer][y][x] = tile
  }
  return { ...map, layers }
}

/** 缩放地图（保留重叠区域，新增区域置 0） */
export function resizeTilemap(map: Tilemap, cols: number, rows: number): Tilemap {
  validateTilemap(map)
  if (!isPositiveInt(cols)) throw new Error('列数 cols 必须为正整数')
  if (!isPositiveInt(rows)) throw new Error('行数 rows 必须为正整数')
  const next = createTilemap(cols, rows, map.tileSize, map.layers.length)
  const w = Math.min(cols, map.cols)
  const h = Math.min(rows, map.rows)
  for (let l = 0; l < map.layers.length; l += 1) {
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) next.layers[l][y][x] = map.layers[l][y][x]
    }
  }
  return next
}

/** 统计非空瓦片数 */
export function countTiles(map: Tilemap): number {
  validateTilemap(map)
  let n = 0
  for (const layer of map.layers) {
    for (const row of layer) {
      for (const tile of row) if (tile !== 0) n += 1
    }
  }
  return n
}

export function exportTilemapJson(map: Tilemap): string {
  validateTilemap(map)
  return JSON.stringify(map, null, 2)
}

export function importTilemapJson(text: string): Tilemap {
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    throw new Error('输入不是合法 JSON')
  }
  const map = raw as Tilemap
  validateTilemap(map)
  return map
}

const TILE_CHARS = ' .oO@#%&*+='

/** ASCII 文本渲染（指定图层，默认第 0 层） */
export function renderTilemapText(map: Tilemap, layer = 0): string {
  validateTilemap(map)
  if (!Number.isInteger(layer) || layer < 0 || layer >= map.layers.length) {
    throw new Error(`图层索引 ${layer} 越界（0-${map.layers.length - 1}）`)
  }
  return map.layers[layer]
    .map((row) => row.map((t) => TILE_CHARS[t % TILE_CHARS.length]).join(''))
    .join('\n')
}
