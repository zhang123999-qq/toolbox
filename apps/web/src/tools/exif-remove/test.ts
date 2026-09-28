import { describe, expect, it } from 'vitest'
import {
  JPEG_QUALITY,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  errorMessage,
  formatSize,
  formatToMime,
  parseFormat,
  savedBytesText,
} from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('parseFormat', () => {
  it('正常解析 jpeg/png（忽略大小写与首尾空格）', () => {
    expect(parseFormat('jpeg')).toBe('jpeg')
    expect(parseFormat('png')).toBe('png')
    expect(parseFormat(' JPEG ')).toBe('jpeg')
    expect(parseFormat('PNG')).toBe('png')
  })

  it('非法抛错', () => {
    expect(() => parseFormat('webp')).toThrow(/格式无效/)
    expect(() => parseFormat('')).toThrow(/格式无效/)
    expect(() => parseFormat('jpg')).toThrow(/格式无效/)
  })
})

describe('formatToMime', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
  })
})

describe('buildOutputFileName', () => {
  it('去扩展名并加 -noexif 后缀', () => {
    expect(buildOutputFileName('photo.png', 'jpeg')).toBe('photo-noexif.jpg')
    expect(buildOutputFileName('a.jpg', 'png')).toBe('a-noexif.png')
    expect(buildOutputFileName('noext', 'jpeg')).toBe('noext-noexif.jpg')
    expect(buildOutputFileName('a.b.c.webp', 'png')).toBe('a.b.c-noexif.png')
  })

  it('空名或纯扩展名兜底为 image', () => {
    expect(buildOutputFileName('', 'jpeg')).toBe('image-noexif.jpg')
    expect(buildOutputFileName('.png', 'png')).toBe('image-noexif.png')
  })
})

describe('formatSize', () => {
  it('B / KB / MB 分档', () => {
    expect(formatSize(0)).toBe('0 B')
    expect(formatSize(512)).toBe('512 B')
    expect(formatSize(1023)).toBe('1023 B')
    expect(formatSize(1024)).toBe('1.0 KB')
    expect(formatSize(1536)).toBe('1.5 KB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MB')
  })

  it('非法输入给 0 B', () => {
    expect(formatSize(-1)).toBe('0 B')
    expect(formatSize(NaN)).toBe('0 B')
    expect(formatSize(Infinity)).toBe('0 B')
  })
})

describe('savedBytesText', () => {
  it('正常节省', () => {
    // 100000 → 85000：节省 15000B = 14.6KB，15.0%
    expect(savedBytesText(100000, 85000)).toBe('节省 14.6 KB（15.0%）')
    // 精确到 B 档
    expect(savedBytesText(1000, 900)).toBe('节省 100 B（10.0%）')
  })

  it('原大小为 0 时返回占位', () => {
    expect(savedBytesText(0, 100)).toBe('节省 0 B（—）')
  })

  it('无节省时给无节省文本', () => {
    expect(savedBytesText(1000, 1200)).toBe('无节省（-20.0%）')
    expect(savedBytesText(1000, 1000)).toBe('无节省（0.0%）')
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

describe('常量', () => {
  it('JPEG 质量固定 0.92，单文件上限 50MB', () => {
    expect(JPEG_QUALITY).toBe(0.92)
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
  })
})
