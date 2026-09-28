import { describe, expect, it } from 'vitest'
import {
  COLOR_VALUE_MAX,
  COLOR_VALUE_MIN,
  MAX_FILE_SIZE,
  adjustPixel,
  adjustPixels,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  parseColorValue,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseColorValue', () => {
  it('空串用默认 0', () => {
    expect(parseColorValue('')).toBe(0)
    expect(parseColorValue('   ')).toBe(0)
  })

  it('正常解析（含负数与边界）', () => {
    expect(parseColorValue('0')).toBe(0)
    expect(parseColorValue('50')).toBe(50)
    expect(parseColorValue('-50')).toBe(-50)
    expect(parseColorValue(String(COLOR_VALUE_MIN))).toBe(-100)
    expect(parseColorValue(String(COLOR_VALUE_MAX))).toBe(100)
    expect(parseColorValue('  25 ')).toBe(25)
  })

  it('非法抛错', () => {
    expect(() => parseColorValue('abc')).toThrow(/调色参数无效/)
    expect(() => parseColorValue('1.5')).toThrow(/调色参数无效/)
    expect(() => parseColorValue('--5')).toThrow(/调色参数无效/)
    expect(() => parseColorValue('101')).toThrow(/超出范围/)
    expect(() => parseColorValue('-101')).toThrow(/超出范围/)
  })
})

describe('adjustPixel', () => {
  it('三项全为 0 时返回原值', () => {
    expect(adjustPixel(100, 150, 200, 0, 0, 0)).toEqual([100, 150, 200])
    expect(adjustPixel(0, 0, 0, 0, 0, 0)).toEqual([0, 0, 0])
    expect(adjustPixel(255, 255, 255, 0, 0, 0)).toEqual([255, 255, 255])
  })

  it('色温：正值偏暖（r+、b−），负值偏冷（r−、b+）', () => {
    expect(adjustPixel(100, 150, 200, 100, 0, 0)).toEqual([145, 150, 155])
    expect(adjustPixel(100, 150, 200, -100, 0, 0)).toEqual([55, 150, 245])
  })

  it('色调：正值偏品红（g−、r+、b+），负值偏绿（g+、r−、b−）', () => {
    expect(adjustPixel(100, 150, 200, 0, 100, 0)).toEqual([115, 120, 215])
    expect(adjustPixel(100, 150, 200, 0, -100, 0)).toEqual([85, 180, 185])
  })

  it('曝光：正值提亮、负值压暗，−100 全黑', () => {
    expect(adjustPixel(100, 150, 200, 0, 0, 100)).toEqual([200, 255, 255])
    expect(adjustPixel(100, 150, 200, 0, 0, -50)).toEqual([50, 75, 100])
    expect(adjustPixel(100, 150, 200, 0, 0, -100)).toEqual([0, 0, 0])
  })

  it('三项叠加钳制到 0–255', () => {
    // r=250+45+15=310 → *2=620 → 255；g=250−30=220 → *2=440 → 255；b 同
    expect(adjustPixel(250, 250, 250, 100, 100, 100)).toEqual([255, 255, 255])
  })

  it('小数结果取整', () => {
    // r=101+33*0.45=115.85 → 116；b=201−33*0.45=186.15 → 186
    expect(adjustPixel(101, 151, 201, 33, 0, 0)).toEqual([116, 151, 186])
  })
})

describe('adjustPixels', () => {
  it('data 长度与尺寸不匹配时抛错', () => {
    expect(() => adjustPixels(new Uint8ClampedArray(10), 2, 2, 0, 0, 0)).toThrow(
      /像素数据长度不匹配/,
    )
  })

  it('全零参数时输出与原图一致（alpha 原样保留）', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 255, 50, 60, 70, 128])
    const out = adjustPixels(data, 2, 1, 0, 0, 0)
    expect(Array.from(out)).toEqual([100, 150, 200, 255, 50, 60, 70, 128])
    expect(out).not.toBe(data)
  })

  it('逐像素应用调色，alpha 原样保留', () => {
    const data = new Uint8ClampedArray([100, 150, 200, 77])
    const out = adjustPixels(data, 1, 1, 100, 0, 0)
    expect(Array.from(out)).toEqual([145, 150, 155, 77])
  })

  it('曝光参数作用于整图', () => {
    const data = new Uint8ClampedArray([100, 100, 100, 255, 200, 200, 200, 255])
    const out = adjustPixels(data, 2, 1, 0, 0, -50)
    expect(Array.from(out)).toEqual([50, 50, 50, 255, 100, 100, 100, 255])
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
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-color-adjust.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-color-adjust.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-color-adjust.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-color-adjust.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-color-adjust.png')
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
