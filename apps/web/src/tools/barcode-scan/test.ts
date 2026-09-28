import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  MAX_SCAN_DIMENSION,
  SUPPORTED_FORMATS,
  assertFileSizeOk,
  computeScanDimensions,
  errorMessage,
  formatBarcodeFormat,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
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
  it('不过限原样返回', () => {
    expect(computeScanDimensions(800, 600)).toEqual({ width: 800, height: 600 })
    expect(computeScanDimensions(MAX_SCAN_DIMENSION, 100)).toEqual({
      width: MAX_SCAN_DIMENSION,
      height: 100,
    })
  })

  it('超限等比缩放至最大边 2000', () => {
    // 横图：4000x3000 → 2000x1500
    expect(computeScanDimensions(4000, 3000)).toEqual({ width: 2000, height: 1500 })
    // 竖图：3000x4000 → 1500x2000
    expect(computeScanDimensions(3000, 4000)).toEqual({ width: 1500, height: 2000 })
    // 正方形：3000x3000 → 2000x2000
    expect(computeScanDimensions(3000, 3000)).toEqual({ width: 2000, height: 2000 })
  })

  it('极小缩放保底 1px', () => {
    expect(computeScanDimensions(10000, 1)).toEqual({ width: 2000, height: 1 })
  })

  it('非法尺寸抛错', () => {
    expect(() => computeScanDimensions(0, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeScanDimensions(-5, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeScanDimensions(NaN, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeScanDimensions(Infinity, 100)).toThrow(/图片尺寸无效/)
    expect(() => computeScanDimensions(100, 0)).toThrow(/图片尺寸无效/)
  })
})

describe('SUPPORTED_FORMATS', () => {
  it('包含全部 7 种一维码制', () => {
    expect([...SUPPORTED_FORMATS]).toEqual([
      'EAN_13',
      'EAN_8',
      'UPC_A',
      'UPC_E',
      'CODE_128',
      'CODE_39',
      'ITF',
    ])
  })
})

describe('formatBarcodeFormat', () => {
  it('支持的 7 种一维码制映射全覆盖', () => {
    expect(formatBarcodeFormat('EAN_13')).toBe('EAN-13')
    expect(formatBarcodeFormat('EAN_8')).toBe('EAN-8')
    expect(formatBarcodeFormat('UPC_A')).toBe('UPC-A')
    expect(formatBarcodeFormat('UPC_E')).toBe('UPC-E')
    expect(formatBarcodeFormat('CODE_128')).toBe('Code 128')
    expect(formatBarcodeFormat('CODE_39')).toBe('Code 39')
    expect(formatBarcodeFormat('ITF')).toBe('ITF')
  })

  it('其他常见码制也有中文名', () => {
    expect(formatBarcodeFormat('QR_CODE')).toBe('二维码')
    expect(formatBarcodeFormat('CODABAR')).toBe('库德巴码')
    expect(formatBarcodeFormat('DATA_MATRIX')).toBe('Data Matrix')
    expect(formatBarcodeFormat('AZTEC')).toBe('Aztec 码')
    expect(formatBarcodeFormat('PDF_417')).toBe('PDF417')
    expect(formatBarcodeFormat('MAXICODE')).toBe('MaxiCode')
    expect(formatBarcodeFormat('RSS_14')).toBe('RSS-14')
    expect(formatBarcodeFormat('RSS_EXPANDED')).toBe('RSS 扩展码')
  })

  it('未知键名原样返回', () => {
    expect(formatBarcodeFormat('SOME_NEW_FORMAT')).toBe('SOME_NEW_FORMAT')
    expect(formatBarcodeFormat('UNKNOWN')).toBe('UNKNOWN')
    expect(formatBarcodeFormat('')).toBe('')
  })
})
