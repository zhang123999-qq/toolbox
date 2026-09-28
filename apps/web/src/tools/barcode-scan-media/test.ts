import { describe, expect, it } from 'vitest'
import {
  barcodeFormatLabel,
  buildScanReport,
  isNotFoundError,
  noCodeFoundMessage,
  normalizeDecodeResult,
} from './utils'

describe('barcode-scan-media / 格式中文映射', () => {
  it('常见格式有中文名', () => {
    expect(barcodeFormatLabel('QR_CODE')).toBe('二维码（QR Code）')
    expect(barcodeFormatLabel('EAN_13')).toBe('一维条码（EAN-13，商品条码）')
    expect(barcodeFormatLabel('CODE_128')).toBe('一维条码（Code 128）')
    expect(barcodeFormatLabel('DATA_MATRIX')).toBe('二维码（Data Matrix）')
    expect(barcodeFormatLabel('ITF')).toBe('一维条码（ITF，物流条码）')
  })

  it('未收录格式兜底', () => {
    expect(barcodeFormatLabel('SOME_NEW_FORMAT')).toBe('未知格式（SOME_NEW_FORMAT）')
    expect(barcodeFormatLabel('')).toBe('未知格式（）')
  })
})

describe('barcode-scan-media / 结果归一化', () => {
  it('null / 空文本 → null', () => {
    expect(normalizeDecodeResult(null)).toBeNull()
    expect(normalizeDecodeResult(undefined)).toBeNull()
    expect(normalizeDecodeResult({ text: '', formatName: 'QR_CODE' })).toBeNull()
    expect(
      normalizeDecodeResult({ text: 123, formatName: 'QR_CODE' } as unknown as {
        text: string
        formatName: string
      }),
    ).toBeNull()
  })

  it('正常结果带出中文格式名', () => {
    expect(normalizeDecodeResult({ text: '6921234567890', formatName: 'EAN_13' })).toEqual({
      text: '6921234567890',
      formatLabel: '一维条码（EAN-13，商品条码）',
    })
    expect(normalizeDecodeResult({ text: 'x', formatName: 'NEW_FMT' })).toEqual({
      text: 'x',
      formatLabel: '未知格式（NEW_FMT）',
    })
  })
})

describe('barcode-scan-media / 报告与提示', () => {
  it('报告含格式、字符数与内容', () => {
    const report = buildScanReport('6921234567890', '一维条码（EAN-13，商品条码）')
    expect(report).toContain('解码成功：一维条码（EAN-13，商品条码）（13 个字符）')
    expect(report).toContain('6921234567890')
  })

  it('超长文本截断展示', () => {
    const long = 'y'.repeat(3000)
    const report = buildScanReport(long, '二维码（QR Code）')
    expect(report).toContain('…')
    expect(report.length).toBeLessThan(3000)
  })

  it('未扫到提示文案', () => {
    expect(noCodeFoundMessage()).toContain('未在画面中识别到条码')
  })
})

describe('barcode-scan-media / NotFound 错误判断', () => {
  it('名字含 NotFound 即视为未找到', () => {
    expect(isNotFoundError(new DOMException('x', 'NotFoundError'))).toBe(true)
    const notFoundException = new Error('nope')
    notFoundException.name = 'NotFoundException'
    expect(isNotFoundError(notFoundException)).toBe(true)
  })

  it('其他错误 / 非 Error 值返回 false', () => {
    expect(isNotFoundError(new Error('boom'))).toBe(false)
    expect(isNotFoundError('NotFound')).toBe(false)
    expect(isNotFoundError(undefined)).toBe(false)
  })
})
