import { describe, expect, it } from 'vitest'
import {
  DEFAULT_COLOR_COUNT,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  errorMessage,
  extractPalette,
  parseColorCount,
  rgbToHex,
  withFallback,
} from './utils'

/** 构造 RGBA 像素数组：colors 为 [r,g,b,a?] 四元组列表 */
function pixelsOf(...colors: Array<[number, number, number, number?]>): number[] {
  return colors.flatMap(([r, g, b, a = 255]) => [r, g, b, a])
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('withFallback', () => {
  it('undefined 时用 fallback', () => {
    expect(withFallback(undefined, '兜底')).toBe('兜底')
  })

  it('空串时用 fallback', () => {
    expect(withFallback('', '兜底')).toBe('兜底')
  })

  it('有译文时原样返回', () => {
    expect(withFallback('实译文', '兜底')).toBe('实译文')
  })
})

describe('rgbToHex', () => {
  it('基本转换（#rrggbb 小写）', () => {
    expect(rgbToHex(255, 0, 0)).toBe('#ff0000')
    expect(rgbToHex(0, 255, 0)).toBe('#00ff00')
    expect(rgbToHex(0, 0, 0)).toBe('#000000')
    expect(rgbToHex(1, 2, 3)).toBe('#010203')
  })

  it('通道钳制到 0–255', () => {
    expect(rgbToHex(300, -5, 128)).toBe('#ff0080')
  })

  it('小数四舍五入', () => {
    expect(rgbToHex(254.6, 0.4, 127.5)).toBe('#ff0080')
  })
})

describe('extractPalette', () => {
  it('空像素返回空数组', () => {
    expect(extractPalette([], 6)).toEqual([])
  })

  it('长度不是 4 的倍数（不足一个像素）返回空数组', () => {
    expect(extractPalette([255, 0, 0], 6)).toEqual([])
  })

  it('count 非法（0/负数）返回空数组', () => {
    const px = pixelsOf([255, 0, 0])
    expect(extractPalette(px, 0)).toEqual([])
    expect(extractPalette(px, -2)).toEqual([])
  })

  it('单色：代表色即该色，占比 100%', () => {
    const px = pixelsOf([255, 0, 0], [255, 0, 0], [255, 0, 0], [255, 0, 0])
    expect(extractPalette(px, 6)).toEqual([
      { hex: '#ff0000', r: 255, g: 0, b: 0, count: 4, ratio: 1 },
    ])
  })

  it('按频次降序取 topN，占比=count/total', () => {
    const px = pixelsOf(
      [255, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [255, 0, 0],
      [0, 255, 0],
      [0, 255, 0],
      [0, 255, 0],
      [0, 0, 255],
    )
    const [first, second] = extractPalette(px, 2)
    expect(first.hex).toBe('#ff0000')
    expect(first.count).toBe(6)
    expect(first.ratio).toBeCloseTo(0.6)
    expect(second.hex).toBe('#00ff00')
    expect(second.count).toBe(3)
    expect(second.ratio).toBeCloseTo(0.3)
  })

  it('代表色取桶内像素均值（四舍五入）', () => {
    // (16,32,48) 与 (24,40,56) 高 4bit 相同 → 同一桶，均值 (20,36,52)
    const px = pixelsOf([16, 32, 48], [24, 40, 56])
    expect(extractPalette(px, 1)).toEqual([
      { hex: '#142434', r: 20, g: 36, b: 52, count: 2, ratio: 1 },
    ])
  })

  it('频次并列时按桶序号升序（确定性）', () => {
    // 红桶序号 3840，蓝桶序号 15
    const px = pixelsOf([255, 0, 0], [0, 0, 255])
    const [first, second] = extractPalette(px, 2)
    expect(first.hex).toBe('#0000ff')
    expect(second.hex).toBe('#ff0000')
  })

  it('Alpha 通道不参与统计（透明像素仍按 RGB 计入）', () => {
    const px = pixelsOf([255, 0, 0, 0], [255, 0, 0, 255])
    const [first] = extractPalette(px, 1)
    expect(first.count).toBe(2)
    expect(first.hex).toBe('#ff0000')
  })

  it('count 大于实际桶数时返回全部桶', () => {
    const px = pixelsOf([255, 0, 0], [0, 255, 0])
    expect(extractPalette(px, 10)).toHaveLength(2)
  })
})

describe('parseColorCount', () => {
  it('空串用默认 6', () => {
    expect(parseColorCount('')).toBe(DEFAULT_COLOR_COUNT)
    expect(parseColorCount('   ')).toBe(DEFAULT_COLOR_COUNT)
  })

  it('正常解析（含首尾空格）', () => {
    expect(parseColorCount('3')).toBe(3)
    expect(parseColorCount('10')).toBe(10)
    expect(parseColorCount(' 6 ')).toBe(6)
  })

  it('非法抛错', () => {
    expect(() => parseColorCount('abc')).toThrow(/颜色数量无效/)
    expect(() => parseColorCount('6.5')).toThrow(/颜色数量无效/)
    expect(() => parseColorCount('-3')).toThrow(/颜色数量无效/)
    expect(() => parseColorCount('2')).toThrow(/超出范围/)
    expect(() => parseColorCount('11')).toThrow(/超出范围/)
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
