/**
 * drawing-board（#798）utils 单测：颜色解析与洪水填充。
 */
import { describe, expect, it } from 'vitest'
import { floodFill, hexToRgba } from './utils'

function makeImage(width: number, height: number, fill: [number, number, number, number]): ImageData {
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
