import { describe, expect, it } from 'vitest'
import {
  buildScanReport,
  looksLikeUrl,
  noCodeFoundMessage,
  normalizeJsqrResult,
  validateRgbaPixels,
} from './utils'

describe('qr-scan-media / 像素校验', () => {
  it('合法 RGBA 缓冲通过', () => {
    expect(() => validateRgbaPixels(10, 20, 10 * 20 * 4)).not.toThrow()
    expect(() => validateRgbaPixels(1, 1, 4)).not.toThrow()
  })

  it('非法尺寸抛中文错', () => {
    expect(() => validateRgbaPixels(0, 20, 0)).toThrow(/图像尺寸非法/)
    expect(() => validateRgbaPixels(-1, 20, 0)).toThrow(/图像尺寸非法/)
    expect(() => validateRgbaPixels(10.5, 20, 0)).toThrow(/图像尺寸非法/)
    expect(() => validateRgbaPixels(10, 0, 0)).toThrow(/图像尺寸非法/)
    expect(() => validateRgbaPixels(10, -2, 0)).toThrow(/图像尺寸非法/)
    expect(() => validateRgbaPixels(10, 1.5, 0)).toThrow(/图像尺寸非法/)
  })

  it('长度非法抛中文错', () => {
    expect(() => validateRgbaPixels(10, 20, -4)).toThrow(/像素数据长度非法/)
    expect(() => validateRgbaPixels(10, 20, 3.5)).toThrow(/像素数据长度非法/)
    expect(() => validateRgbaPixels(10, 20, 10 * 20 * 4 - 1)).toThrow(/像素数据损坏/)
    expect(() => validateRgbaPixels(10, 20, 10 * 20 * 4 + 4)).toThrow(/像素数据损坏/)
  })
})

describe('qr-scan-media / 结果归一化', () => {
  it('null / 空结果 → null', () => {
    expect(normalizeJsqrResult(null)).toBeNull()
    expect(normalizeJsqrResult(undefined)).toBeNull()
    expect(normalizeJsqrResult({ data: '' })).toBeNull()
    expect(normalizeJsqrResult({ data: 123 } as unknown as { data: string })).toBeNull()
  })

  it('正常文本原样返回', () => {
    expect(normalizeJsqrResult({ data: 'hello' })).toBe('hello')
    expect(normalizeJsqrResult({ data: 'https://example.com' })).toBe('https://example.com')
  })
})

describe('qr-scan-media / 网址判断与报告', () => {
  it('常见 scheme 识别为网址', () => {
    expect(looksLikeUrl('https://example.com')).toBe(true)
    expect(looksLikeUrl('HTTP://EXAMPLE.COM')).toBe(true)
    expect(looksLikeUrl('  ftp://a/b ')).toBe(true)
    expect(looksLikeUrl('mailto:a@b.com')).toBe(true)
    expect(looksLikeUrl('tel:123')).toBe(true)
    expect(looksLikeUrl('hello world')).toBe(false)
    expect(looksLikeUrl('example.com')).toBe(false)
  })

  it('报告含字符数与网址提示', () => {
    const report = buildScanReport('https://example.com')
    expect(report).toContain('解码成功（19 个字符）')
    expect(report).toContain('https://example.com')
    expect(report).toContain('疑似网址')
    const plain = buildScanReport('hello')
    expect(plain).toContain('解码成功（5 个字符）')
    expect(plain).not.toContain('疑似网址')
  })

  it('超长文本截断展示', () => {
    const long = 'x'.repeat(3000)
    const report = buildScanReport(long)
    expect(report).toContain('解码成功（3000 个字符）')
    expect(report).toContain('…')
    expect(report.length).toBeLessThan(3000)
  })

  it('未扫到提示文案', () => {
    expect(noCodeFoundMessage()).toContain('未在画面中识别到二维码')
  })
})
