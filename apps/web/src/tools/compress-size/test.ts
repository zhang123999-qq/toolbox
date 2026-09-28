import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  MAX_PROBE_ITERATIONS,
  MAX_SHRINK_ROUNDS,
  QUALITY_MAX,
  QUALITY_MIN,
  TARGET_SIZE_MAX_KB,
  TARGET_SIZE_MIN_KB,
  assertFileSizeOk,
  attemptSummaryText,
  buildOutputFileName,
  errorMessage,
  formatToMime,
  narrowQualityRange,
  needsResize,
  nextQualityProbe,
  parseTargetSize,
  shrinkForRetry,
  unreachableErrorText,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseTargetSize', () => {
  it('正常解析：KB 字符串转字节', () => {
    expect(parseTargetSize('1')).toBe(1024)
    expect(parseTargetSize('500')).toBe(500 * 1024)
    expect(parseTargetSize(String(TARGET_SIZE_MAX_KB))).toBe(TARGET_SIZE_MAX_KB * 1024)
    expect(parseTargetSize(' 300 ')).toBe(300 * 1024)
  })

  it('空串抛错', () => {
    expect(() => parseTargetSize('')).toThrow(/不能为空/)
    expect(() => parseTargetSize('   ')).toThrow(/不能为空/)
  })

  it('非整数抛错', () => {
    expect(() => parseTargetSize('abc')).toThrow(/目标大小无效/)
    expect(() => parseTargetSize('12.5')).toThrow(/目标大小无效/)
    expect(() => parseTargetSize('-5')).toThrow(/目标大小无效/)
  })

  it('超出 1–51200KB 范围抛错', () => {
    expect(() => parseTargetSize('0')).toThrow(/超出范围/)
    expect(() => parseTargetSize(String(TARGET_SIZE_MAX_KB + 1))).toThrow(/超出范围/)
    expect(TARGET_SIZE_MIN_KB).toBe(1)
  })
})

describe('nextQualityProbe', () => {
  it('取区间中点（向下取整）', () => {
    expect(nextQualityProbe(1, 100)).toBe(50)
    expect(nextQualityProbe(51, 100)).toBe(75)
    expect(nextQualityProbe(1, 1)).toBe(1)
    expect(nextQualityProbe(QUALITY_MIN, QUALITY_MAX)).toBe(50)
  })
})

describe('narrowQualityRange', () => {
  it('达标向高质量侧收敛', () => {
    expect(narrowQualityRange(1, 100, 50, true)).toEqual({ low: 51, high: 100 })
  })

  it('未达标向低质量侧收敛', () => {
    expect(narrowQualityRange(1, 100, 50, false)).toEqual({ low: 1, high: 49 })
  })

  it('二分在有限步内收敛（防死循环）', () => {
    // 模拟最坏情况：每次都未达标，区间每次减半
    let low = QUALITY_MIN
    let high = QUALITY_MAX
    let iters = 0
    while (low <= high && iters < MAX_PROBE_ITERATIONS) {
      const q = nextQualityProbe(low, high)
      ;({ low, high } = narrowQualityRange(low, high, q, false))
      iters += 1
    }
    expect(iters).toBeLessThanOrEqual(MAX_PROBE_ITERATIONS)
    expect(iters).toBeLessThanOrEqual(7)
  })
})

describe('shrinkForRetry', () => {
  it('面积 ×0.7 等比缩小', () => {
    // 800×600 → scale=√0.7≈0.8367 → 669×502
    expect(shrinkForRetry(800, 600)).toEqual({ width: 669, height: 502 })
  })

  it('极小尺寸保底 1px', () => {
    expect(shrinkForRetry(1, 1)).toEqual({ width: 1, height: 1 })
    expect(shrinkForRetry(2, 1)).toEqual({ width: 2, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => shrinkForRetry(0, 100)).toThrow(/尺寸无效/)
    expect(() => shrinkForRetry(-3, 100)).toThrow(/尺寸无效/)
    expect(() => shrinkForRetry(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => shrinkForRetry(Infinity, 100)).toThrow(/尺寸无效/)
  })
})

describe('needsResize', () => {
  it('轮数未用完且尺寸可缩小 → true', () => {
    expect(needsResize(800, 600, 0)).toBe(true)
    expect(needsResize(800, 600, MAX_SHRINK_ROUNDS - 1)).toBe(true)
  })

  it('用完 3 轮 → false', () => {
    expect(needsResize(800, 600, MAX_SHRINK_ROUNDS)).toBe(false)
    expect(needsResize(800, 600, 99)).toBe(false)
  })

  it('已压到 1px 再缩无变化 → false（防死循环）', () => {
    expect(needsResize(1, 1, 0)).toBe(false)
  })
})

describe('unreachableErrorText', () => {
  it('包含目标大小与出路提示', () => {
    const text = unreachableErrorText(5 * 1024)
    expect(text).toContain('无法压缩到目标大小')
    expect(text).toContain('5.00 KB')
    expect(text).toContain('调大目标大小')
  })
})

describe('formatToMime', () => {
  it('格式转 MIME（无 PNG）', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('webp')).toBe('image/webp')
  })
})

describe('buildOutputFileName', () => {
  it('替换扩展名并加后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-targetsize.jpg')
    expect(buildOutputFileName('a.jpeg', 'webp')).toBe('a-targetsize.webp')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-targetsize.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-targetsize.jpg')
    expect(buildOutputFileName('.png', 'webp')).toBe('image-targetsize.webp')
  })
})

describe('attemptSummaryText', () => {
  it('拼接尝试次数/质量/尺寸/体积变化', () => {
    const text = attemptSummaryText({
      attempts: 13,
      quality: 100,
      width: 669,
      height: 502,
      origSize: 10240,
      newSize: 1000,
    })
    expect(text).toContain('尝试 13 次')
    expect(text).toContain('最终质量 100')
    expect(text).toContain('最终尺寸 669×502')
    expect(text).toContain('10.0 KB → 1000 B')
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
