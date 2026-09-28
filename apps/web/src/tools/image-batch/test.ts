import { describe, expect, it } from 'vitest'
import {
  CONCURRENCY,
  DEFAULT_QUALITY,
  MAX_BATCH_SIZE,
  MAX_DIMENSION_LIMIT,
  MAX_FILE_SIZE,
  assertBatchSizeOk,
  assertFileSizeOk,
  buildOutputFileName,
  compressionRatioText,
  computeOutputDimensions,
  createQueue,
  doneCount,
  effectiveQuality,
  errorMessage,
  formatToMime,
  parseMaxDimension,
  parseQuality,
  progressPercent,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseQuality', () => {
  it('空串用默认 80', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
    expect(parseQuality('   ')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 85 ')).toBe(85)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('parseMaxDimension', () => {
  it('空串为 0（不限）', () => {
    expect(parseMaxDimension('')).toBe(0)
  })

  it('正常解析', () => {
    expect(parseMaxDimension('0')).toBe(0)
    expect(parseMaxDimension('1920')).toBe(1920)
  })

  it('非法抛错', () => {
    expect(() => parseMaxDimension('abc')).toThrow(/尺寸无效/)
    expect(() => parseMaxDimension('-1')).toThrow(/尺寸无效/)
    expect(() => parseMaxDimension(String(MAX_DIMENSION_LIMIT + 1))).toThrow(/尺寸过大/)
  })
})

describe('computeOutputDimensions', () => {
  it('不过限原样返回', () => {
    expect(computeOutputDimensions(800, 600, 0)).toEqual({ width: 800, height: 600 })
    expect(computeOutputDimensions(800, 600, 1920)).toEqual({ width: 800, height: 600 })
  })

  it('超限等比缩放', () => {
    // 4000x3000，最大边 2000 → 2000x1500
    expect(computeOutputDimensions(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
    // 竖图：3000x4000 → 1500x2000
    expect(computeOutputDimensions(3000, 4000, 2000)).toEqual({ width: 1500, height: 2000 })
  })

  it('极小缩放保底 1px', () => {
    expect(computeOutputDimensions(10000, 1, 1)).toEqual({ width: 1, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeOutputDimensions(0, 100, 0)).toThrow(/尺寸无效/)
    expect(() => computeOutputDimensions(NaN, 100, 0)).toThrow(/尺寸无效/)
    expect(() => computeOutputDimensions(Infinity, 100, 0)).toThrow(/尺寸无效/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('webp')).toBe('image/webp')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 80)).toBeUndefined()
    expect(effectiveQuality('jpeg', 80)).toBe(0.8)
    expect(effectiveQuality('webp', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('加 -batch 后缀并替换扩展名', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-batch.jpg')
    expect(buildOutputFileName('a.webp', 'png')).toBe('a-batch.png')
    expect(buildOutputFileName('noext', 'webp')).toBe('noext-batch.webp')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-batch.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-batch.png')
  })
})

describe('compressionRatioText', () => {
  it('正常比例', () => {
    expect(compressionRatioText(1000, 250)).toBe('25.0%')
    expect(compressionRatioText(1000, 1000)).toBe('100.0%')
  })

  it('原大小为 0 时返回占位', () => {
    expect(compressionRatioText(0, 100)).toBe('—')
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

describe('assertBatchSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertBatchSizeOk(0)).not.toThrow()
    expect(() => assertBatchSizeOk(MAX_BATCH_SIZE)).not.toThrow()
  })

  it('超过 20 张抛错', () => {
    expect(() => assertBatchSizeOk(MAX_BATCH_SIZE + 1)).toThrow(/最多处理 20 张/)
  })
})

describe('createQueue', () => {
  it('0 个返回空队列', () => {
    expect(createQueue(0)).toEqual([])
  })

  it('id 为下标且全部 pending', () => {
    expect(createQueue(3)).toEqual([
      { id: 0, status: 'pending' },
      { id: 1, status: 'pending' },
      { id: 2, status: 'pending' },
    ])
  })
})

describe('doneCount', () => {
  it('成功+失败计入完成，等待/处理中不计', () => {
    expect(
      doneCount([
        { id: 0, status: 'pending' },
        { id: 1, status: 'processing' },
        { id: 2, status: 'success' },
        { id: 3, status: 'error' },
      ]),
    ).toBe(2)
  })

  it('空队列为 0', () => {
    expect(doneCount([])).toBe(0)
  })
})

describe('progressPercent', () => {
  it('总数为 0 时返回 0（避免除零）', () => {
    expect(progressPercent(0, 0)).toBe(0)
  })

  it('正常百分比（四舍五入）', () => {
    expect(progressPercent(0, 5)).toBe(0)
    expect(progressPercent(1, 2)).toBe(50)
    expect(progressPercent(3, 5)).toBe(60)
    expect(progressPercent(2, 3)).toBe(67)
    expect(progressPercent(5, 5)).toBe(100)
  })
})

describe('并发常量', () => {
  it('并发上限为 3', () => {
    expect(CONCURRENCY).toBe(3)
  })
})
