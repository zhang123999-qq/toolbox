import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  SCAN_MAX_DIMENSION,
  assertFileSizeOk,
  computeScanDimensions,
  errorMessage,
  formatBarcodeFormat,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('assertFileSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertFileSizeOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('computeScanDimensions', () => {
  it('最大边未超 2000 原样返回', () => {
    expect(computeScanDimensions(800, 600)).toEqual({ width: 800, height: 600 })
    expect(computeScanDimensions(SCAN_MAX_DIMENSION, SCAN_MAX_DIMENSION)).toEqual({
      width: SCAN_MAX_DIMENSION,
      height: SCAN_MAX_DIMENSION,
    })
  })

  it('超限等比缩放至最大边 2000', () => {
    // 4000x3000 → 2000x1500
    expect(computeScanDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    // 竖图：3000x4000 → 1500x2000
    expect(computeScanDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 })
  })

  it('极小缩放保底 1px', () => {
    expect(computeScanDimensions(10000, 1)).toEqual({ width: 2000, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeScanDimensions(0, 100)).toThrow(/尺寸无效/)
    expect(() => computeScanDimensions(100, -1)).toThrow(/尺寸无效/)
    expect(() => computeScanDimensions(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => computeScanDimensions(Infinity, 100)).toThrow(/尺寸无效/)
  })
})

describe('formatBarcodeFormat', () => {
  it('QR_CODE 映射为中文码制名', () => {
    expect(formatBarcodeFormat('QR_CODE')).toBe('二维码')
  })

  it('未知码制原样返回枚举名', () => {
    expect(formatBarcodeFormat('DATA_MATRIX')).toBe('DATA_MATRIX')
    expect(formatBarcodeFormat('')).toBe('')
  })
})
