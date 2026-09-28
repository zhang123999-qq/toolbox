import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  assertSvgText,
  buildOutputFileName,
  compressionRatioText,
  errorMessage,
  isSvgFile,
  parseOptions,
} from './utils'

function svgFile(name = 'a.svg', type = 'image/svg+xml'): File {
  return new File(['<svg></svg>'], name, { type })
}

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

describe('isSvgFile', () => {
  it('MIME 为 image/svg+xml 即通过', () => {
    expect(isSvgFile(svgFile('noext', 'image/svg+xml'))).toBe(true)
  })

  it('扩展名 .svg（大小写不敏感）即通过', () => {
    expect(isSvgFile(svgFile('a.svg', ''))).toBe(true)
    expect(isSvgFile(svgFile('A.SVG', 'text/plain'))).toBe(true)
  })

  it('非 SVG 文件不通过', () => {
    expect(isSvgFile(new File(['x'], 'a.txt', { type: 'text/plain' }))).toBe(false)
    expect(isSvgFile(new File(['x'], 'a.svgx', { type: '' }))).toBe(false)
  })
})

describe('assertSvgText', () => {
  it('空文本抛错', () => {
    expect(() => assertSvgText('')).toThrow(/文件为空/)
    expect(() => assertSvgText('   \n  ')).toThrow(/文件为空/)
  })

  it('不含 <svg 标签抛错', () => {
    expect(() => assertSvgText('<html><body>hi</body></html>')).toThrow(/不是有效的 SVG/)
  })

  it('含 <svg 标签通过', () => {
    expect(() => assertSvgText('<svg></svg>')).not.toThrow()
    expect(() => assertSvgText('<?xml version="1.0"?>\n<svg xmlns="x">\n</svg>')).not.toThrow()
  })
})

describe('parseOptions', () => {
  it('on/off 组合转布尔', () => {
    expect(parseOptions({ multipass: 'on', pretty: 'off' })).toEqual({
      multipass: true,
      pretty: false,
    })
    expect(parseOptions({ multipass: 'off', pretty: 'on' })).toEqual({
      multipass: false,
      pretty: true,
    })
    expect(parseOptions({ multipass: 'on', pretty: 'on' })).toEqual({
      multipass: true,
      pretty: true,
    })
    expect(parseOptions({ multipass: 'off', pretty: 'off' })).toEqual({
      multipass: false,
      pretty: false,
    })
  })
})

describe('buildOutputFileName', () => {
  it('去扩展名并加 -optimized.svg', () => {
    expect(buildOutputFileName('icon.svg')).toBe('icon-optimized.svg')
    expect(buildOutputFileName('a.b.svg')).toBe('a.b-optimized.svg')
  })

  it('无扩展名直接拼接', () => {
    expect(buildOutputFileName('noext')).toBe('noext-optimized.svg')
  })

  it('空名兜底为 image', () => {
    expect(buildOutputFileName('')).toBe('image-optimized.svg')
    expect(buildOutputFileName('.svg')).toBe('image-optimized.svg')
  })
})

describe('compressionRatioText', () => {
  it('正常比例', () => {
    expect(compressionRatioText(1000, 250)).toBe('25.0%')
    expect(compressionRatioText(1000, 1000)).toBe('100.0%')
  })

  it('原大小为 0 时返回占位', () => {
    expect(compressionRatioText(0, 100)).toBe('—')
    expect(compressionRatioText(-5, 100)).toBe('—')
  })
})
