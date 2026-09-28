import { describe, expect, it } from 'vitest'
import {
  DEFAULT_THRESHOLD,
  MAX_FILE_SIZE,
  MAX_THRESHOLD,
  assertFileSizeOk,
  computeDiff,
  diffRatioText,
  errorMessage,
  parseThreshold,
} from './utils'
import type { PixelData } from './utils'

/** 构造 w×h 的像素数据，fill(i) 返回第 i 个像素的 [r,g,b,a] */
function makePixels(
  w: number,
  h: number,
  fill: (i: number) => [number, number, number, number],
): PixelData {
  const data: Uint8ClampedArray = new Uint8ClampedArray(w * h * 4)
  for (let i = 0; i < w * h; i++) {
    data.set(fill(i), i * 4)
  }
  return { data, width: w, height: h }
}

const solid =
  (r: number, g: number, b: number, a = 255): ((i: number) => [number, number, number, number]) =>
  () => [r, g, b, a]

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseThreshold', () => {
  it('空串用默认 30', () => {
    expect(parseThreshold('')).toBe(DEFAULT_THRESHOLD)
    expect(parseThreshold('   ')).toBe(DEFAULT_THRESHOLD)
  })

  it('正常解析边界 0/255', () => {
    expect(parseThreshold('0')).toBe(0)
    expect(parseThreshold(String(MAX_THRESHOLD))).toBe(MAX_THRESHOLD)
    expect(parseThreshold(' 30 ')).toBe(30)
  })

  it('非法抛错', () => {
    expect(() => parseThreshold('abc')).toThrow(/阈值无效/)
    expect(() => parseThreshold('12.5')).toThrow(/阈值无效/)
    expect(() => parseThreshold('-1')).toThrow(/阈值无效/)
    expect(() => parseThreshold('256')).toThrow(/超出范围/)
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

describe('computeDiff', () => {
  it('全同像素：0 差异，差异层全透明', () => {
    const a = makePixels(2, 2, solid(10, 20, 30))
    const b = makePixels(2, 2, solid(10, 20, 30))
    const res = computeDiff(a, b, 30)
    expect(res.diffPixels).toBe(0)
    expect(res.totalPixels).toBe(4)
    expect(res.diffData.length).toBe(16)
    for (let i = 0; i < 4; i++) {
      expect(Array.from(res.diffData.slice(i * 4, i * 4 + 4))).toEqual([0, 0, 0, 0])
    }
  })

  it('全异像素：全部标红半透明', () => {
    const a = makePixels(2, 2, solid(0, 0, 0))
    const b = makePixels(2, 2, solid(255, 255, 255))
    const res = computeDiff(a, b, 30)
    expect(res.diffPixels).toBe(4)
    expect(res.totalPixels).toBe(4)
    for (let i = 0; i < 4; i++) {
      expect(Array.from(res.diffData.slice(i * 4, i * 4 + 4))).toEqual([255, 0, 0, 128])
    }
  })

  it('阈值边界：差值 == threshold 不算差异，> threshold 才算', () => {
    // 像素0：r 差值恰好 30；像素1：r 差值 31；其余通道相同
    const a = makePixels(2, 1, solid(100, 100, 100))
    const b = makePixels(2, 1, (i) => (i === 0 ? [130, 100, 100, 255] : [131, 100, 100, 255]))
    const res = computeDiff(a, b, 30)
    expect(res.diffPixels).toBe(1)
    expect(Array.from(res.diffData.slice(0, 4))).toEqual([0, 0, 0, 0])
    expect(Array.from(res.diffData.slice(4, 8))).toEqual([255, 0, 0, 128])
  })

  it('仅 B 通道差异也能检出（覆盖 db 分支）', () => {
    const a = makePixels(1, 1, solid(50, 50, 50))
    const b = makePixels(1, 1, solid(50, 50, 250))
    expect(computeDiff(a, b, 30).diffPixels).toBe(1)
  })

  it('alpha 通道忽略：RGB 相同仅 alpha 不同不算差异', () => {
    const a = makePixels(1, 1, solid(10, 20, 30, 255))
    const b = makePixels(1, 1, solid(10, 20, 30, 0))
    const res = computeDiff(a, b, 30)
    expect(res.diffPixels).toBe(0)
  })

  it('阈值为 0 时任何 RGB 差异都算', () => {
    const a = makePixels(1, 1, solid(10, 20, 30))
    const b = makePixels(1, 1, solid(11, 20, 30))
    expect(computeDiff(a, b, 0).diffPixels).toBe(1)
  })

  it('宽高不一致抛错', () => {
    const a = makePixels(2, 2, solid(0, 0, 0))
    expect(() => computeDiff(a, makePixels(3, 2, solid(0, 0, 0)), 30)).toThrow(/尺寸不一致/)
    expect(() => computeDiff(a, makePixels(2, 3, solid(0, 0, 0)), 30)).toThrow(/尺寸不一致/)
  })

  it('空图抛错', () => {
    const ok = makePixels(2, 2, solid(0, 0, 0))
    const emptyW: PixelData = { data: new Uint8ClampedArray(0), width: 0, height: 2 }
    const emptyH: PixelData = { data: new Uint8ClampedArray(0), width: 2, height: 0 }
    expect(() => computeDiff(emptyW, ok, 30)).toThrow(/尺寸无效/)
    expect(() => computeDiff(ok, emptyH, 30)).toThrow(/尺寸无效/)
    expect(() => computeDiff({ ...ok, height: 0 }, { ...ok, height: 0 }, 30)).toThrow(/尺寸无效/)
    expect(() => computeDiff({ ...ok, width: 0 }, { ...ok, width: 0 }, 30)).toThrow(/尺寸无效/)
  })
})

describe('diffRatioText', () => {
  it('保留 1 位小数', () => {
    expect(diffRatioText(1, 8)).toBe('12.5%')
    expect(diffRatioText(0, 8000)).toBe('0.0%')
    expect(diffRatioText(8000, 8000)).toBe('100.0%')
  })

  it('总数非法时返回占位符', () => {
    expect(diffRatioText(0, 0)).toBe('—')
    expect(diffRatioText(5, -1)).toBe('—')
  })
})
