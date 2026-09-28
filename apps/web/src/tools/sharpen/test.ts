import { describe, expect, it } from 'vitest'
import {
  DEFAULT_STRENGTH,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseStrength,
  sharpenPixels,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseStrength', () => {
  it('空串用默认 50', () => {
    expect(parseStrength('')).toBe(DEFAULT_STRENGTH)
    expect(parseStrength('   ')).toBe(DEFAULT_STRENGTH)
  })

  it('正常解析 0–100', () => {
    expect(parseStrength('0')).toBe(0)
    expect(parseStrength('100')).toBe(100)
    expect(parseStrength(' 85 ')).toBe(85)
  })

  it('非法抛错', () => {
    expect(() => parseStrength('abc')).toThrow(/强度无效/)
    expect(() => parseStrength('85.5')).toThrow(/强度无效/)
    expect(() => parseStrength('-1')).toThrow(/强度无效/)
    expect(() => parseStrength('101')).toThrow(/超出范围/)
  })
})

describe('sharpenPixels', () => {
  it('数据长度不匹配抛错', () => {
    expect(() => sharpenPixels(new Uint8ClampedArray(10), 2, 2, 50)).toThrow(/长度不匹配/)
  })

  it('strength=0 返回原数据拷贝（等价原图）', () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16])
    const out = sharpenPixels(data, 2, 2, 0)
    expect(Array.from(out)).toEqual(Array.from(data))
    expect(out).not.toBe(data)
  })

  it('1×1 像素：边缘 clamp 使邻域全为自身，输出不变', () => {
    // v = 5c − (c+c+c+c) = c
    const out = sharpenPixels(new Uint8ClampedArray([10, 20, 30, 40]), 1, 1, 100)
    expect(Array.from(out)).toEqual([10, 20, 30, 40])
  })

  it('3×3 中心高亮：中心钳制到 255，边缘按核加权', () => {
    const w = 3
    const h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 100
      data[i * 4 + 1] = 100
      data[i * 4 + 2] = 100
      data[i * 4 + 3] = 255
    }
    // 中心像素提亮并改 alpha
    const ci = (1 * w + 1) * 4
    data[ci] = 200
    data[ci + 1] = 200
    data[ci + 2] = 200
    data[ci + 3] = 123

    const out = sharpenPixels(data, w, h, 100) // k=1
    // 中心：5*200 − 4*100 = 600 → 钳制 255
    expect(out[ci]).toBe(255)
    expect(out[ci + 1]).toBe(255)
    expect(out[ci + 2]).toBe(255)
    // alpha 原样保留
    expect(out[ci + 3]).toBe(123)
    // 上边缘中点：5*100 − (100+200+100+100) = 0（上邻域 clamp 为自身）
    const ti = (0 * w + 1) * 4
    expect(out[ti]).toBe(0)
    // 左上角：均匀区域保持 100
    expect(out[0]).toBe(100)
    expect(out[3]).toBe(255)
  })

  it('暗中心被压到 0（下钳制）', () => {
    const w = 3
    const h = 3
    const data = new Uint8ClampedArray(w * h * 4)
    for (let i = 0; i < w * h; i++) {
      data[i * 4] = 255
      data[i * 4 + 1] = 255
      data[i * 4 + 2] = 255
      data[i * 4 + 3] = 255
    }
    const ci = (1 * w + 1) * 4
    data[ci] = 0
    data[ci + 1] = 0
    data[ci + 2] = 0
    const out = sharpenPixels(data, w, h, 100)
    // 中心：5*0 − 4*255 = −1020 → 钳制 0
    expect(out[ci]).toBe(0)
  })

  it('小数结果四舍五入取整', () => {
    // strength=50 → k=0.5，中心核权重 3
    const w = 3
    const h = 3
    const data = new Uint8ClampedArray(w * h * 4).fill(100)
    const ci = (1 * w + 1) * 4
    // 下邻域设为 101：3*100 − 0.5*(100+101+100+100) = 99.5 → 100
    data[(2 * w + 1) * 4] = 101
    const out = sharpenPixels(data, w, h, 50)
    expect(out[ci]).toBe(100)
    expect(Number.isInteger(out[ci])).toBe(true)
  })

  it('非零强度返回新数组', () => {
    const data = new Uint8ClampedArray([10, 20, 30, 40])
    const out = sharpenPixels(data, 1, 1, 50)
    expect(out).not.toBe(data)
    expect(out.length).toBe(data.length)
  })
})

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -sharpen 后缀', () => {
    expect(buildOutputFileName('photo.png', 'png')).toBe('photo-sharpen.png')
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-sharpen.jpg')
    expect(buildOutputFileName('a.webp', 'webp')).toBe('a-sharpen.webp')
    expect(buildOutputFileName('noext', 'png')).toBe('noext-sharpen.png')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-sharpen.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-sharpen.png')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})
