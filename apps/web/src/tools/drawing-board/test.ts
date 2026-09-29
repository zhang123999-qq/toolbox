/**
 * drawing-board（#798）utils 单测：颜色解析、洪水填充与几何函数。
 */
import { describe, expect, it } from 'vitest'
import { arrowHeadPoints, floodFill, hexToRgba, shapePoints, sprayPoints } from './utils'

function makeImage(
  width: number,
  height: number,
  fill: [number, number, number, number],
): ImageData {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    data.set(fill, i * 4)
  }
  return { width, height, data } as ImageData
}

function pixel(img: ImageData, x: number, y: number): string {
  const i = (y * img.width + x) * 4
  return `${img.data[i]},${img.data[i + 1]},${img.data[i + 2]}`
}

describe('drawing-board · utils', () => {
  it('hexToRgba 解析 6 位 hex', () => {
    expect(hexToRgba('#ff0000')).toEqual([255, 0, 0, 255])
    expect(hexToRgba('#00ff00')).toEqual([0, 255, 0, 255])
    expect(hexToRgba('#0000ff')).toEqual([0, 0, 255, 255])
  })

  it('hexToRgba 解析 3 位简写', () => {
    expect(hexToRgba('#f00')).toEqual([255, 0, 0, 255])
    expect(hexToRgba('#abc')).toEqual([170, 187, 204, 255])
  })

  it('hexToRgba 非法输入回落黑色', () => {
    expect(hexToRgba('not-a-color')).toEqual([0, 0, 0, 255])
    expect(hexToRgba('')).toEqual([0, 0, 0, 255])
  })

  it('floodFill 填充整个纯色区域', () => {
    const img = makeImage(4, 4, [255, 255, 255, 255])
    floodFill(img, 1, 1, [255, 0, 0, 255])
    for (let y = 0; y < 4; y += 1) {
      for (let x = 0; x < 4; x += 1) {
        expect(pixel(img, x, y)).toBe('255,0,0')
      }
    }
  })

  it('floodFill 不越过颜色边界', () => {
    const img = makeImage(4, 4, [255, 255, 255, 255])
    // 中间画一条黑色竖线当边界
    for (let y = 0; y < 4; y += 1) {
      const i = (y * 4 + 2) * 4
      img.data.set([0, 0, 0, 255], i)
    }
    floodFill(img, 0, 0, [0, 0, 255, 255])
    expect(pixel(img, 0, 0)).toBe('0,0,255')
    expect(pixel(img, 1, 3)).toBe('0,0,255')
    expect(pixel(img, 2, 0)).toBe('0,0,0') // 边界线不动
    expect(pixel(img, 3, 3)).toBe('255,255,255') // 右侧不动
  })

  it('floodFill 目标色与填充色相同时不做任何事', () => {
    const img = makeImage(2, 2, [10, 20, 30, 255])
    floodFill(img, 0, 0, [10, 20, 30, 255])
    expect(pixel(img, 1, 1)).toBe('10,20,30')
  })

  it('floodFill 越界坐标直接返回', () => {
    const img = makeImage(2, 2, [255, 255, 255, 255])
    floodFill(img, -1, 0, [255, 0, 0, 255])
    floodFill(img, 5, 5, [255, 0, 0, 255])
    expect(pixel(img, 0, 0)).toBe('255,255,255')
  })
})

describe('drawing-board · 几何函数', () => {
  it('shapePoints 三角形：顶点在顶边中点', () => {
    const pts = shapePoints('triangle', 0, 0, 100, 60)
    expect(pts).toHaveLength(3)
    expect(pts[0]).toEqual([50, 0])
    expect(pts[1]).toEqual([0, 60])
    expect(pts[2]).toEqual([100, 60])
  })

  it('shapePoints 菱形：四个顶点在各边中点', () => {
    const pts = shapePoints('diamond', 0, 0, 100, 60)
    expect(pts).toHaveLength(4)
    expect(pts[0]).toEqual([50, 0])
    expect(pts[2]).toEqual([50, 60])
  })

  it('shapePoints 星形：10 个交错顶点，首顶点在正上方', () => {
    const pts = shapePoints('star', 0, 0, 100, 100)
    expect(pts).toHaveLength(10)
    // 首顶点在正上方（外顶点）
    expect(pts[0][0]).toBeCloseTo(50, 5)
    expect(pts[0][1]).toBeCloseTo(50 - Math.hypot(100, 100) / 2, 5)
    // 外顶点到中心距离大于内顶点
    const d = (p: readonly [number, number]) => Math.hypot(p[0] - 50, p[1] - 50)
    expect(d(pts[0])).toBeGreaterThan(d(pts[1]))
  })

  it('arrowHeadPoints：箭头指向 +x 时头部对称张开', () => {
    const [p1, p2] = arrowHeadPoints(0, 0, 100, 0, 20)
    expect(p1[0]).toBeLessThan(100)
    expect(p2[0]).toBeLessThan(100)
    // 两斜边端点关于箭杆对称（canvas y 轴向下，符号相反即可）
    expect(p1[1]).toBeCloseTo(-p2[1], 8)
    expect(p1[1]).not.toBeCloseTo(0, 8)
    expect(Math.hypot(p1[0] - 100, p1[1])).toBeCloseTo(20, 5)
    expect(Math.hypot(p2[0] - 100, p2[1])).toBeCloseTo(20, 5)
  })

  it('sprayPoints：点数 = (步进+1) × 密度', () => {
    let seed = 42
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648
      return seed / 2147483648
    }
    // 单点：dist=0 → steps=1 → 2 轮 × 5 = 10 个点
    const pts = sprayPoints(0, 0, 0, 0, 10, 5, rand)
    expect(pts).toHaveLength(10)
  })

  it('sprayPoints：雾点围绕线段分布', () => {
    const pts = sprayPoints(0, 0, 100, 0, 10, 4, () => 0.5)
    expect(pts.length).toBeGreaterThan(0)
    // rand()=0.5 → 角度 π，r=√0.5×10，点应在线段附近 ± 半径内
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(-10)
      expect(x).toBeLessThanOrEqual(110)
      expect(Math.abs(y)).toBeLessThanOrEqual(10)
    }
  })
})
