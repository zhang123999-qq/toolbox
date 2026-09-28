/**
 * tilemap（#788）utils 单测：瓦片地图编辑器。
 */
import { describe, expect, it } from 'vitest'
import {
  countTiles,
  createTilemap,
  exportTilemapJson,
  fillRect,
  importTilemapJson,
  renderTilemapText,
  resizeTilemap,
  setTile,
  validateTilemap,
} from './utils'

describe('createTilemap', () => {
  it('创建空地图', () => {
    const m = createTilemap(3, 2, 16, 2)
    expect(m.cols).toBe(3)
    expect(m.rows).toBe(2)
    expect(m.tileSize).toBe(16)
    expect(m.layers).toHaveLength(2)
    expect(m.layers[0][1][2]).toBe(0)
  })
  it('默认 tileSize 与图层数', () => {
    const m = createTilemap(2, 2)
    expect(m.tileSize).toBe(32)
    expect(m.layers).toHaveLength(1)
  })
  it('非法参数报错', () => {
    expect(() => createTilemap(0, 2)).toThrow('cols')
    expect(() => createTilemap(2, -1)).toThrow('rows')
    expect(() => createTilemap(2, 2, 0)).toThrow('tileSize')
    expect(() => createTilemap(2, 2, 32, 0)).toThrow('layerCount')
  })
})

describe('validateTilemap', () => {
  it('合法地图通过', () => {
    expect(() => validateTilemap(createTilemap(2, 2))).not.toThrow()
  })
  it('非对象报错', () => {
    expect(() => validateTilemap('x' as never)).toThrow('必须是对象')
  })
  it('行列不一致报错', () => {
    const m = createTilemap(2, 2)
    m.layers[0].push([1, 2])
    expect(() => validateTilemap(m)).toThrow('行数应为 2')
  })
  it('列数不一致报错', () => {
    const m = createTilemap(2, 2)
    m.layers[0][0] = [1]
    expect(() => validateTilemap(m)).toThrow('列数应为 2')
  })
  it('瓦片 id 非法报错', () => {
    const m = createTilemap(2, 2)
    m.layers[0][0][0] = -1
    expect(() => validateTilemap(m)).toThrow('非负整数')
    m.layers[0][0][0] = 1.5
    expect(() => validateTilemap(m)).toThrow('非负整数')
  })
  it('无图层报错', () => {
    const m = createTilemap(2, 2)
    m.layers = []
    expect(() => validateTilemap(m)).toThrow('至少需要 1 个图层')
  })
})

describe('setTile', () => {
  it('设置瓦片并保持不可变', () => {
    const m = createTilemap(3, 3)
    const n = setTile(m, 0, 1, 2, 5)
    expect(n.layers[0][2][1]).toBe(5)
    expect(m.layers[0][2][1]).toBe(0)
  })
  it('越界报错', () => {
    const m = createTilemap(2, 2)
    expect(() => setTile(m, 0, 2, 0, 1)).toThrow('x 坐标 2 越界')
    expect(() => setTile(m, 0, 0, 2, 1)).toThrow('y 坐标 2 越界')
    expect(() => setTile(m, 1, 0, 0, 1)).toThrow('图层索引 1 越界')
    expect(() => setTile(m, 0, 0.5, 0, 1)).toThrow('越界')
  })
  it('瓦片 id 非法报错', () => {
    const m = createTilemap(2, 2)
    expect(() => setTile(m, 0, 0, 0, -1)).toThrow('瓦片 id')
  })
})

describe('fillRect', () => {
  it('矩形填充', () => {
    const m = createTilemap(4, 4)
    const n = fillRect(m, 0, 1, 1, 2, 2, 3)
    expect(n.layers[0][1][1]).toBe(3)
    expect(n.layers[0][2][2]).toBe(3)
    expect(n.layers[0][0][0]).toBe(0)
  })
  it('逆序坐标自动归一化', () => {
    const m = createTilemap(4, 4)
    const n = fillRect(m, 0, 3, 3, 1, 1, 7)
    expect(n.layers[0][1][1]).toBe(7)
    expect(n.layers[0][3][3]).toBe(7)
  })
  it('超界自动裁剪', () => {
    const m = createTilemap(2, 2)
    const n = fillRect(m, 0, -5, -5, 10, 10, 9)
    expect(countTiles(n)).toBe(4)
  })
  it('列数非法报错', () => {
    const m = createTilemap(2, 2, 16, 1)
    expect(() => validateTilemap({ ...m, cols: 0 })).toThrow('cols')
    expect(() => validateTilemap({ ...m, rows: -1 })).toThrow('rows')
    expect(() => validateTilemap({ ...m, tileSize: 0 })).toThrow('tileSize')
  })
  it('图层越界报错', () => {
    const m = createTilemap(2, 2)
    expect(() => fillRect(m, 5, 0, 0, 1, 1, 1)).toThrow('图层索引 5 越界')
  })
  it('瓦片 id 非法报错（fillRect）', () => {
    const m = createTilemap(2, 2)
    expect(() => fillRect(m, 0, 0, 0, 1, 1, -1)).toThrow('非负整数')
    expect(() => fillRect(m, 0, 0, 0, 1, 1, 1.5)).toThrow('非负整数')
  })
})

describe('resizeTilemap', () => {
  it('放大保留原数据', () => {
    const m = setTile(createTilemap(2, 2), 0, 0, 0, 4)
    const n = resizeTilemap(m, 4, 4)
    expect(n.cols).toBe(4)
    expect(n.layers[0][0][0]).toBe(4)
    expect(n.layers[0][3][3]).toBe(0)
  })
  it('缩小裁剪', () => {
    const m = setTile(createTilemap(3, 3), 0, 2, 2, 9)
    const n = resizeTilemap(m, 2, 2)
    expect(n.layers[0].flat()).not.toContain(9)
  })
  it('非法尺寸报错', () => {
    const m = createTilemap(2, 2)
    expect(() => resizeTilemap(m, 0, 2)).toThrow('cols')
    expect(() => resizeTilemap(m, 2, 0)).toThrow('rows')
  })
})

describe('countTiles', () => {
  it('统计非空瓦片', () => {
    let m = createTilemap(2, 2)
    m = setTile(m, 0, 0, 0, 1)
    m = setTile(m, 0, 1, 1, 2)
    expect(countTiles(m)).toBe(2)
  })
})

describe('export/import', () => {
  it('导出导入往返一致', () => {
    const m = setTile(createTilemap(3, 2, 16), 0, 1, 1, 5)
    const n = importTilemapJson(exportTilemapJson(m))
    expect(n).toEqual(m)
  })
  it('非法 JSON 报错', () => {
    expect(() => importTilemapJson('xxx')).toThrow('合法 JSON')
  })
  it('结构非法报错', () => {
    expect(() => importTilemapJson('{"cols":2,"rows":2,"tileSize":16,"layers":[]}')).toThrow('至少需要 1 个图层')
  })
})

describe('renderTilemapText', () => {
  it('ASCII 渲染', () => {
    let m = createTilemap(3, 1)
    m = setTile(m, 0, 0, 0, 1)
    m = setTile(m, 0, 2, 0, 2)
    expect(renderTilemapText(m)).toBe('. o')
  })
  it('图层越界报错', () => {
    const m = createTilemap(2, 2)
    expect(() => renderTilemapText(m, 3)).toThrow('图层索引 3 越界')
  })
})
