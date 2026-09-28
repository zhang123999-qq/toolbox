import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DELAY,
  DEFAULT_QUALITY,
  DEFAULT_REPEAT,
  MAX_DELAY,
  MAX_FILE_SIZE,
  MAX_FRAMES,
  MAX_QUALITY,
  MAX_REPEAT,
  MAX_SIDE,
  MIN_DELAY,
  MIN_FRAMES,
  MIN_QUALITY,
  MIN_REPEAT,
  assertFileSizeOk,
  assertFrameLimit,
  buildOutputFileName,
  computeContainRect,
  errorMessage,
  parseDelay,
  parseQuality,
  parseRepeat,
  validateFrameCount,
  validateOutputSize,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseDelay', () => {
  it('空串用默认 200', () => {
    expect(parseDelay('')).toBe(DEFAULT_DELAY)
    expect(parseDelay('   ')).toBe(DEFAULT_DELAY)
  })

  it('正常解析（含边界）', () => {
    expect(parseDelay(String(MIN_DELAY))).toBe(MIN_DELAY)
    expect(parseDelay(String(MAX_DELAY))).toBe(MAX_DELAY)
    expect(parseDelay(' 500 ')).toBe(500)
  })

  it('非法抛错', () => {
    expect(() => parseDelay('abc')).toThrow(/帧延迟无效/)
    expect(() => parseDelay('1.5')).toThrow(/帧延迟无效/)
    expect(() => parseDelay('-1')).toThrow(/帧延迟无效/)
    expect(() => parseDelay(String(MIN_DELAY - 1))).toThrow(/超出范围/)
    expect(() => parseDelay(String(MAX_DELAY + 1))).toThrow(/超出范围/)
  })
})

describe('parseRepeat', () => {
  it('空串用默认 0（无限循环）', () => {
    expect(parseRepeat('')).toBe(DEFAULT_REPEAT)
  })

  it('正常解析（含边界）', () => {
    expect(parseRepeat(String(MIN_REPEAT))).toBe(MIN_REPEAT)
    expect(parseRepeat(String(MAX_REPEAT))).toBe(MAX_REPEAT)
    expect(parseRepeat('3')).toBe(3)
  })

  it('非法抛错', () => {
    expect(() => parseRepeat('x')).toThrow(/循环次数无效/)
    expect(() => parseRepeat('-1')).toThrow(/循环次数无效/)
    expect(() => parseRepeat(String(MAX_REPEAT + 1))).toThrow(/超出范围/)
  })
})

describe('parseQuality', () => {
  it('空串用默认 10', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析（含边界）', () => {
    expect(parseQuality(String(MIN_QUALITY))).toBe(MIN_QUALITY)
    expect(parseQuality(String(MAX_QUALITY))).toBe(MAX_QUALITY)
    expect(parseQuality('10')).toBe(10)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('high')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality(String(MAX_QUALITY + 1))).toThrow(/超出范围/)
  })
})

describe('computeContainRect', () => {
  it('横图放入正方形：等比缩放居中', () => {
    // 800x600 → 400x400：scale=0.5 → 400x300，x=0，y=50
    expect(computeContainRect(800, 600, 400, 400)).toEqual({ x: 0, y: 50, w: 400, h: 300 })
  })

  it('竖图放入正方形：等比缩放居中', () => {
    // 600x800 → 400x400：scale=0.5 → 300x400，x=50，y=0
    expect(computeContainRect(600, 800, 400, 400)).toEqual({ x: 50, y: 0, w: 300, h: 400 })
  })

  it('同尺寸原样居中', () => {
    expect(computeContainRect(400, 400, 400, 400)).toEqual({ x: 0, y: 0, w: 400, h: 400 })
  })

  it('小图放大铺满（contain 取最小缩放）', () => {
    // 100x50 → 400x400：scale=min(4,8)=4 → 400x200，y=100
    expect(computeContainRect(100, 50, 400, 400)).toEqual({ x: 0, y: 100, w: 400, h: 200 })
  })

  it('极小缩放保底 1px', () => {
    const r = computeContainRect(10000, 1, 1, 1)
    expect(r.w).toBe(1)
    expect(r.h).toBe(1)
  })

  it('非法尺寸抛错', () => {
    expect(() => computeContainRect(NaN, 100, 100, 100)).toThrow(/尺寸无效/)
    expect(() => computeContainRect(100, 0, 100, 100)).toThrow(/尺寸无效/)
    expect(() => computeContainRect(100, 100, -5, 100)).toThrow(/尺寸无效/)
    expect(() => computeContainRect(100, 100, 100, Infinity)).toThrow(/尺寸无效/)
  })
})

describe('validateFrameCount', () => {
  it('2 帧及以上通过', () => {
    expect(() => validateFrameCount(MIN_FRAMES)).not.toThrow()
    expect(() => validateFrameCount(MAX_FRAMES)).not.toThrow()
  })

  it('不足 2 帧抛错', () => {
    expect(() => validateFrameCount(0)).toThrow(/至少需要 2 帧/)
    expect(() => validateFrameCount(1)).toThrow(/至少需要 2 帧/)
    expect(() => validateFrameCount(1.5)).toThrow(/至少需要 2 帧/)
  })
})

describe('assertFrameLimit', () => {
  it('100 帧以内通过', () => {
    expect(() => assertFrameLimit(MAX_FRAMES)).not.toThrow()
  })

  it('超过 100 帧抛错', () => {
    expect(() => assertFrameLimit(MAX_FRAMES + 1)).toThrow(/帧数过多/)
  })
})

describe('validateOutputSize', () => {
  it('2048 以内通过', () => {
    expect(() => validateOutputSize(MAX_SIDE, MAX_SIDE)).not.toThrow()
    expect(() => validateOutputSize(800, 600)).not.toThrow()
  })

  it('任一边超限抛错', () => {
    expect(() => validateOutputSize(MAX_SIDE + 1, 100)).toThrow(/尺寸过大/)
    expect(() => validateOutputSize(100, MAX_SIDE + 1)).toThrow(/尺寸过大/)
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

describe('buildOutputFileName', () => {
  it('替换扩展名并加 -merged 后缀', () => {
    expect(buildOutputFileName('frame1.png')).toBe('frame1-merged.gif')
    expect(buildOutputFileName('a.jpg')).toBe('a-merged.gif')
    expect(buildOutputFileName('noext')).toBe('noext-merged.gif')
  })

  it('空名兜底为 frames', () => {
    expect(buildOutputFileName('')).toBe('frames-merged.gif')
    expect(buildOutputFileName('.png')).toBe('frames-merged.gif')
  })
})
