import { describe, expect, it } from 'vitest'
import {
  HEADER_BYTES,
  MAX_FILE_SIZE,
  aspectRatioText,
  assertFileSizeOk,
  detectImageFormat,
  errorMessage,
  formatBytesText,
  formatLabel,
  guessDeclaredType,
  isFormatMismatch,
  megapixelsText,
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

describe('HEADER_BYTES', () => {
  it('Tool 层读取的头部长度为 512', () => {
    expect(HEADER_BYTES).toBe(512)
  })
})

/** 构造带指定文件头的字节数组 */
function withHead(head: number[], total = 64): Uint8Array {
  const b = new Uint8Array(total)
  b.set(head)
  return b
}

const PNG_HEAD = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]
const JPEG_HEAD = [0xff, 0xd8, 0xff, 0xe0]
const GIF_HEAD = [0x47, 0x49, 0x46, 0x38, 0x39, 0x61] // GIF89a
const BMP_HEAD = [0x42, 0x4d]
const WEBP_HEAD = [0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50] // RIFF....WEBP
const ICO_HEAD = [0x00, 0x00, 0x01, 0x00]

/** 构造 ftyp 容器：品牌槽位可定制 */
function ftyp(brands: string[], total = 64): Uint8Array {
  const b = new Uint8Array(total)
  const ascii = (s: string, off: number) => {
    for (let i = 0; i < s.length; i++) b[off + i] = s.charCodeAt(i)
  }
  ascii('ftyp', 4)
  brands.forEach((brand, i) => ascii(brand, 8 + i * 4))
  return b
}

function textBytes(s: string): Uint8Array {
  return new TextEncoder().encode(s)
}

describe('detectImageFormat', () => {
  it('识别 PNG', () => {
    expect(detectImageFormat(withHead(PNG_HEAD))).toBe('png')
  })

  it('识别 JPEG', () => {
    expect(detectImageFormat(withHead(JPEG_HEAD))).toBe('jpeg')
  })

  it('识别 GIF', () => {
    expect(detectImageFormat(withHead(GIF_HEAD))).toBe('gif')
  })

  it('识别 BMP', () => {
    expect(detectImageFormat(withHead(BMP_HEAD))).toBe('bmp')
  })

  it('识别 WebP（RIFF + WEBP）', () => {
    expect(detectImageFormat(withHead(WEBP_HEAD))).toBe('webp')
  })

  it('RIFF 但不是 WEBP 则不算 WebP', () => {
    const b = withHead(WEBP_HEAD)
    b[8] = 0x41 // 'A' 破坏 WEBP 签名
    expect(detectImageFormat(b)).toBe('unknown')
  })

  it('识别 AVIF（主品牌 avif）', () => {
    expect(detectImageFormat(ftyp(['avif']))).toBe('avif')
  })

  it('识别 AVIF（兼容品牌槽含 avif）', () => {
    expect(detectImageFormat(ftyp(['mif1', 'avif']))).toBe('avif')
  })

  it('ftyp 但品牌是 heic 时不算 AVIF', () => {
    expect(detectImageFormat(ftyp(['heic']))).toBe('unknown')
  })

  it('无 ftyp 的长文件不算 AVIF', () => {
    expect(detectImageFormat(new Uint8Array(200))).toBe('unknown')
  })

  it('识别 ICO', () => {
    expect(detectImageFormat(withHead(ICO_HEAD))).toBe('ico')
  })

  it('识别 SVG（<svg 开头，带前导空白）', () => {
    expect(detectImageFormat(textBytes('  \n<svg xmlns="http://www.w3.org/2000/svg">'))).toBe('svg')
  })

  it('识别 SVG（<?xml 开头，带 BOM）', () => {
    expect(detectImageFormat(textBytes('﻿<?xml version="1.0"?><svg>'))).toBe('svg')
  })

  it('纯文本不是 SVG', () => {
    expect(detectImageFormat(textBytes('hello world, this is not an image'))).toBe('unknown')
  })

  it('截断字节返回 unknown', () => {
    expect(detectImageFormat(new Uint8Array(0))).toBe('unknown')
    expect(detectImageFormat(new Uint8Array([0x89, 0x50]))).toBe('unknown')
    expect(detectImageFormat(new Uint8Array([0x42]))).toBe('unknown')
    expect(detectImageFormat(new Uint8Array(8))).toBe('unknown') // ftyp 不完整
  })

  it('随机字节返回 unknown', () => {
    expect(detectImageFormat(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe('unknown')
  })
})

describe('formatLabel', () => {
  it('全部格式展示名', () => {
    expect(formatLabel('png')).toBe('PNG')
    expect(formatLabel('jpeg')).toBe('JPEG')
    expect(formatLabel('webp')).toBe('WebP')
    expect(formatLabel('gif')).toBe('GIF')
    expect(formatLabel('bmp')).toBe('BMP')
    expect(formatLabel('avif')).toBe('AVIF')
    expect(formatLabel('ico')).toBe('ICO')
    expect(formatLabel('svg')).toBe('SVG')
    expect(formatLabel('unknown')).toBe('未知')
  })
})

describe('aspectRatioText', () => {
  it('化简宽高比', () => {
    expect(aspectRatioText(1920, 1080)).toBe('16:9')
    expect(aspectRatioText(800, 600)).toBe('4:3')
    expect(aspectRatioText(100, 100)).toBe('1:1')
    expect(aspectRatioText(3840, 2160)).toBe('16:9')
  })

  it('非法尺寸抛错', () => {
    expect(() => aspectRatioText(0, 100)).toThrow(/尺寸无效/)
    expect(() => aspectRatioText(-800, 600)).toThrow(/尺寸无效/)
    expect(() => aspectRatioText(800, -1)).toThrow(/尺寸无效/)
    expect(() => aspectRatioText(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => aspectRatioText(800, Infinity)).toThrow(/尺寸无效/)
    expect(() => aspectRatioText(800.5, 600)).toThrow(/尺寸无效/)
  })
})

describe('megapixelsText', () => {
  it('保留 1 位小数', () => {
    expect(megapixelsText(4000, 3000)).toBe('12.0 MP')
    expect(megapixelsText(100, 100)).toBe('0.0 MP')
    expect(megapixelsText(6000, 4000)).toBe('24.0 MP')
  })

  it('非法尺寸抛错', () => {
    expect(() => megapixelsText(0, 100)).toThrow(/尺寸无效/)
    expect(() => megapixelsText(NaN, 100)).toThrow(/尺寸无效/)
    expect(() => megapixelsText(100, -5)).toThrow(/尺寸无效/)
  })
})

describe('formatBytesText', () => {
  it('零与非法输入', () => {
    expect(formatBytesText(0)).toBe('0 B')
    expect(formatBytesText(-1)).toBe('0 B')
    expect(formatBytesText(NaN)).toBe('0 B')
  })

  it('各级单位', () => {
    expect(formatBytesText(1)).toBe('1.00 B')
    expect(formatBytesText(1024)).toBe('1.00 KB')
    expect(formatBytesText(1536)).toBe('1.50 KB')
    expect(formatBytesText(10 * 1024)).toBe('10.0 KB')
    expect(formatBytesText(5 * 1024 * 1024)).toBe('5.00 MB')
    expect(formatBytesText(150 * 1024 * 1024)).toBe('150 MB')
    expect(formatBytesText(2 * 1024 * 1024 * 1024)).toBe('2.00 GB')
  })
})

describe('guessDeclaredType', () => {
  it('优先用 MIME', () => {
    expect(guessDeclaredType('photo.png', 'image/png')).toBe('png')
    expect(guessDeclaredType('photo.jpg', 'image/jpeg')).toBe('jpg')
    expect(guessDeclaredType('a', 'IMAGE/PNG')).toBe('png')
    expect(guessDeclaredType('a', 'image/svg+xml')).toBe('svg')
    expect(guessDeclaredType('a.ico', 'image/x-icon')).toBe('ico')
    expect(guessDeclaredType('a.ico', 'image/vnd.microsoft.icon')).toBe('ico')
  })

  it('无 MIME 时用扩展名', () => {
    expect(guessDeclaredType('photo.jpg', '')).toBe('jpg')
    expect(guessDeclaredType('photo.JPEG', '')).toBe('jpg')
    expect(guessDeclaredType('icon.ICO', '')).toBe('ico')
  })

  it('无法推断返回空串', () => {
    expect(guessDeclaredType('noext', '')).toBe('')
    expect(guessDeclaredType('', '')).toBe('')
  })
})

describe('isFormatMismatch', () => {
  it('一致不算不符（含 jpeg/jpg 归一化）', () => {
    expect(isFormatMismatch('png', 'png')).toBe(false)
    expect(isFormatMismatch('jpg', 'jpeg')).toBe(false)
    expect(isFormatMismatch('jpeg', 'jpeg')).toBe(false)
    expect(isFormatMismatch('svg', 'svg')).toBe(false)
  })

  it('不一致算不符', () => {
    expect(isFormatMismatch('jpg', 'png')).toBe(true)
    expect(isFormatMismatch('png', 'gif')).toBe(true)
  })

  it('无法判定时不算不符', () => {
    expect(isFormatMismatch('', 'png')).toBe(false)
    expect(isFormatMismatch('png', 'unknown')).toBe(false)
    expect(isFormatMismatch('', 'unknown')).toBe(false)
  })
})
