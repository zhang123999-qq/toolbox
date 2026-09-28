import { describe, expect, it } from 'vitest'
import {
  DEFAULT_DECODE_MIME,
  MAX_FILE_SIZE,
  assertFileSizeOk,
  base64ApproxBytes,
  buildOutputFileName,
  errorMessage,
  isValidBase64,
  mimeToExtension,
  normalizeBase64Input,
  parseDataUrl,
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
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk(MAX_FILE_SIZE + 1)).toThrow(/文件过大/)
  })
})

describe('normalizeBase64Input', () => {
  it('去除换行/空格/制表符', () => {
    expect(normalizeBase64Input('AA\nAA\r\n AA\tAA ')).toBe('AAAAAAAA')
  })

  it('无空白原样返回', () => {
    expect(normalizeBase64Input('TWFu')).toBe('TWFu')
  })

  it('空白符容忍：全空白变空串', () => {
    expect(normalizeBase64Input(' \n\t ')).toBe('')
  })
})

describe('isValidBase64', () => {
  it('合法 Base64 通过', () => {
    expect(isValidBase64('TWFu')).toBe(true) // 无 padding
    expect(isValidBase64('TWE=')).toBe(true) // 一个 =
    expect(isValidBase64('TQ==')).toBe(true) // 两个 =
  })

  it('空串非法', () => {
    expect(isValidBase64('')).toBe(false)
  })

  it('长度 % 4 ≠ 0 非法', () => {
    expect(isValidBase64('ABC')).toBe(false)
    expect(isValidBase64('ABCDE')).toBe(false)
  })

  it('非法字符（= 不在末尾、超量 padding）非法', () => {
    expect(isValidBase64('AB=C')).toBe(false)
    expect(isValidBase64('A===')).toBe(false)
    expect(isValidBase64('AB*C')).toBe(false)
    expect(isValidBase64('AB CD'.replace(' ', ''))).toBe(true) // 对照：去空白后合法
  })
})

describe('base64ApproxBytes', () => {
  it('len*3/4 取整', () => {
    expect(base64ApproxBytes(4)).toBe(3)
    expect(base64ApproxBytes(0)).toBe(0)
    // 5*3/4=3.75 → 3
    expect(base64ApproxBytes(5)).toBe(3)
    expect(base64ApproxBytes(1_000_000)).toBe(750_000)
  })
})

describe('mimeToExtension', () => {
  it('常见图片 MIME 映射', () => {
    expect(mimeToExtension('image/jpeg')).toBe('jpg')
    expect(mimeToExtension('image/png')).toBe('png')
    expect(mimeToExtension('image/webp')).toBe('webp')
    expect(mimeToExtension('image/gif')).toBe('gif')
    expect(mimeToExtension('image/bmp')).toBe('bmp')
    expect(mimeToExtension('image/avif')).toBe('avif')
    expect(mimeToExtension('image/svg+xml')).toBe('svg')
    expect(mimeToExtension('image/x-icon')).toBe('ico')
  })

  it('大小写/首尾空白容忍', () => {
    expect(mimeToExtension('IMAGE/JPEG')).toBe('jpg')
    expect(mimeToExtension(' image/png ')).toBe('png')
  })

  it('未知类型兜底 png', () => {
    expect(mimeToExtension('image/xyz')).toBe('png')
    expect(mimeToExtension('text/plain')).toBe('png')
    expect(mimeToExtension('')).toBe('png')
  })
})

describe('buildOutputFileName', () => {
  it('按 MIME 定扩展名', () => {
    expect(buildOutputFileName('image/jpeg')).toBe('base64-image.jpg')
    expect(buildOutputFileName('image/png')).toBe('base64-image.png')
    expect(buildOutputFileName('image/webp')).toBe('base64-image.webp')
  })

  it('未知 MIME 兜底 png', () => {
    expect(buildOutputFileName('application/octet-stream')).toBe('base64-image.png')
  })
})

describe('parseDataUrl', () => {
  it('有前缀：取 mime 与 payload', () => {
    expect(parseDataUrl('data:image/png;base64,AAA')).toEqual({ mime: 'image/png', base64: 'AAA' })
  })

  it('前缀带多余参数（如 charset）时仍取 mime', () => {
    expect(parseDataUrl('data:image/jpeg;charset=utf-8;base64,BBB')).toEqual({
      mime: 'image/jpeg',
      base64: 'BBB',
    })
  })

  it('前缀无 mime（data:;base64,）时 mime=null', () => {
    expect(parseDataUrl('data:;base64,CCC')).toEqual({ mime: null, base64: 'CCC' })
  })

  it('scheme 大小写不敏感', () => {
    expect(parseDataUrl('DATA:image/png;base64,AAA')).toEqual({
      mime: 'image/png',
      base64: 'AAA',
    })
  })

  it('无前缀：mime=null、base64=原文', () => {
    expect(parseDataUrl('TWFu')).toEqual({ mime: null, base64: 'TWFu' })
  })

  it('非图片 mime 抛错', () => {
    expect(() => parseDataUrl('data:text/plain;base64,AAA')).toThrow(/不支持的 DataURL 类型/)
    expect(() => parseDataUrl('data:application/json,AAA')).toThrow(/仅支持图片/)
  })

  it('默认解码 MIME 为 image/png', () => {
    expect(DEFAULT_DECODE_MIME).toBe('image/png')
  })
})
