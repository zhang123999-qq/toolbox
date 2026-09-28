import { describe, expect, it, vi } from 'vitest'
import type { Translate } from '../../i18n'
import {
  LANG_CHI_SIM,
  LANG_ENG,
  MAX_FILE_SIZE,
  OCR_MAX_DIMENSION,
  assertFileSizeOk,
  computeOcrDimensions,
  errorMessage,
  isTerminalStatus,
  parseLangs,
  progressText,
  terminateWorker,
} from './utils'

/** 模拟翻译：返回带参数的 key 标记，便于断言映射关系 */
const t: Translate = (key, params) => {
  if (params === undefined) return `[${key}]`
  const qs = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join(',')
  return `[${key} ${qs}]`
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
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

describe('parseLangs', () => {
  it('全选返回两个语言代码', () => {
    expect(parseLangs('1', '1')).toEqual([LANG_CHI_SIM, LANG_ENG])
  })

  it('单选只返回对应代码', () => {
    expect(parseLangs('1', '')).toEqual([LANG_CHI_SIM])
    expect(parseLangs('', '1')).toEqual([LANG_ENG])
  })

  it('一个都不选抛错', () => {
    expect(() => parseLangs('', '')).toThrow(/至少选择一种识别语言/)
  })
})

describe('computeOcrDimensions', () => {
  it('不过限原样返回（取整）', () => {
    expect(computeOcrDimensions(800, 600)).toEqual({ width: 800, height: 600 })
    expect(computeOcrDimensions(OCR_MAX_DIMENSION, OCR_MAX_DIMENSION)).toEqual({
      width: OCR_MAX_DIMENSION,
      height: OCR_MAX_DIMENSION,
    })
  })

  it('超限等比缩到最大边', () => {
    // 4000x3000 → 2000x1500
    expect(computeOcrDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    // 竖图：3000x4000 → 1500x2000
    expect(computeOcrDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 })
  })

  it('极小缩放保底 1px', () => {
    expect(computeOcrDimensions(10000, 2)).toEqual({ width: 2000, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeOcrDimensions(0, 100)).toThrow(/尺寸无效/)
    expect(() => computeOcrDimensions(100, -5)).toThrow(/尺寸无效/)
    expect(() => computeOcrDimensions(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => computeOcrDimensions(Infinity, 100)).toThrow(/尺寸无效/)
  })
})

describe('progressText', () => {
  it('引擎/语言包加载状态映射', () => {
    expect(progressText('loading tesseract core', 0, t)).toBe('[ocr.status.loadingCore]')
    expect(progressText('loading language traineddata', 0.5, t)).toBe('[ocr.status.loadingLang]')
  })

  it('初始化状态映射', () => {
    expect(progressText('initializing tesseract', 0, t)).toBe('[ocr.status.initializing]')
    expect(progressText('initializing api', 0, t)).toBe('[ocr.status.initializing]')
  })

  it('识别中带百分比（四舍五入）', () => {
    expect(progressText('recognizing text', 0.42, t)).toBe('[ocr.status.recognizing percent=42]')
    expect(progressText('recognizing text', 0.426, t)).toBe('[ocr.status.recognizing percent=43]')
    expect(progressText('recognizing text', 1, t)).toBe('[ocr.status.recognizing percent=100]')
  })

  it('未知 status 原样返回', () => {
    expect(progressText('some-future-status', 0.1, t)).toBe('some-future-status')
  })
})

describe('isTerminalStatus', () => {
  it('终态返回 true', () => {
    expect(isTerminalStatus('done')).toBe(true)
    expect(isTerminalStatus('failed')).toBe(true)
    expect(isTerminalStatus('terminated')).toBe(true)
  })

  it('非终态返回 false', () => {
    expect(isTerminalStatus('recognizing text')).toBe(false)
    expect(isTerminalStatus('')).toBe(false)
  })
})

describe('terminateWorker', () => {
  it('空值直接跳过', async () => {
    await expect(terminateWorker(null)).resolves.toBeUndefined()
    await expect(terminateWorker(undefined)).resolves.toBeUndefined()
  })

  it('正常调用 terminate', async () => {
    const terminate = vi.fn(async () => ({}))
    await terminateWorker({ recognize: vi.fn(), terminate })
    expect(terminate).toHaveBeenCalledTimes(1)
  })

  it('terminate 抛错被吞掉', async () => {
    const terminate = vi.fn(async () => {
      throw new Error('boom')
    })
    await expect(terminateWorker({ recognize: vi.fn(), terminate })).resolves.toBeUndefined()
  })
})
