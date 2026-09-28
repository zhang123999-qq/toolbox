import { describe, expect, it } from 'vitest'
import {
  DEFAULT_QUALITY,
  MAX_INPUT_CHARS,
  assertInputSizeOk,
  base64ToBytes,
  buildOutputFileName,
  effectiveQuality,
  errorMessage,
  formatToMime,
  isValidBase64,
  normalizeBase64Input,
  parseBase64Input,
  parseQuality,
  sniffMimeFromBytes,
} from './utils'

/** 1x1 透明 PNG（真实图片字节，用于魔数/解码测试） */
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='

function bytesOf(...vals: number[]): Uint8Array {
  return new Uint8Array(vals)
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('assertInputSizeOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertInputSizeOk(MAX_INPUT_CHARS)).not.toThrow()
    expect(() => assertInputSizeOk(0)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertInputSizeOk(MAX_INPUT_CHARS + 1)).toThrow(/输入文本过长/)
  })
})

describe('normalizeBase64Input', () => {
  it('去除换行/空格/制表符', () => {
    expect(normalizeBase64Input('aGVs\nbG8g\td29y bGQ=')).toBe('aGVsbG8gd29ybGQ=')
  })

  it('无空白原样返回', () => {
    expect(normalizeBase64Input('aGVsbG8=')).toBe('aGVsbG8=')
  })
})

describe('isValidBase64', () => {
  it('合法', () => {
    expect(isValidBase64('aGVsbG8=')).toBe(true)
    expect(isValidBase64('aGVsbG8gd29ybGQ=')).toBe(true)
    expect(isValidBase64('TWFu')).toBe(true)
    expect(isValidBase64('TWE=')).toBe(true)
    expect(isValidBase64('TQ==')).toBe(true)
  })

  it('非法：空串、长度非 4 倍数、非法字符', () => {
    expect(isValidBase64('')).toBe(false)
    expect(isValidBase64('abc')).toBe(false)
    expect(isValidBase64('aGVsbG8')).toBe(false)
    expect(isValidBase64('aGVs!G8=')).toBe(false)
    expect(isValidBase64('aGVsbG8====')).toBe(false)
    expect(isValidBase64('====')).toBe(false)
  })
})

describe('parseBase64Input', () => {
  it('空输入抛错（含仅空白）', () => {
    expect(() => parseBase64Input('')).toThrow(/输入不能为空/)
    expect(() => parseBase64Input('   \n\t ')).toThrow(/输入不能为空/)
  })

  it('超长输入抛错', () => {
    // 用合法 base64 字符拼出超限长度，绕过字符校验直达长度校验
    const over = 'QUJD'.repeat(Math.floor(MAX_INPUT_CHARS / 4) + 1)
    expect(() => parseBase64Input(over)).toThrow(/输入文本过长/)
  })

  it('完整 DataURL：解析 MIME 与数据段', () => {
    const parsed = parseBase64Input(`data:image/png;base64,${PNG_1X1_B64}`)
    expect(parsed.mime).toBe('image/png')
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('DataURL 允许 ;charset 等参数与 MIME 大小写', () => {
    const parsed = parseBase64Input(`DATA:IMAGE/JPEG;charset=utf-8;base64,${PNG_1X1_B64}`)
    expect(parsed.mime).toBe('IMAGE/JPEG')
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('DataURL 无 MIME 时 mime 为 null', () => {
    const parsed = parseBase64Input(`data:;base64,${PNG_1X1_B64}`)
    expect(parsed.mime).toBeNull()
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('DataURL 数据段可含换行（先规范化）', () => {
    const withBreaks = `${PNG_1X1_B64.slice(0, 20)}\n${PNG_1X1_B64.slice(20)}`
    const parsed = parseBase64Input(`data:image/png;base64,${withBreaks}`)
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('DataURL 非图片 MIME 抛错', () => {
    expect(() => parseBase64Input('data:text/plain;base64,aGVsbG8=')).toThrow(
      /不支持的 DataURL 类型/,
    )
  })

  it('DataURL 空数据段/非法数据段抛错', () => {
    expect(() => parseBase64Input('data:image/png;base64,')).toThrow(/不是合法的 Base64/)
    expect(() => parseBase64Input('data:image/png;base64,!!!')).toThrow(/不是合法的 Base64/)
  })

  it('纯 base64：mime 为 null', () => {
    const parsed = parseBase64Input(PNG_1X1_B64)
    expect(parsed.mime).toBeNull()
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('纯 base64 允许换行与首尾空白', () => {
    const parsed = parseBase64Input(`  \n${PNG_1X1_B64}\n`)
    expect(parsed.data).toBe(PNG_1X1_B64)
  })

  it('纯 base64 非法字符抛错', () => {
    expect(() => parseBase64Input('aGVsbG8gd29ybGQ')).toThrow(/不是合法的 Base64/)
    expect(() => parseBase64Input('!!!')).toThrow(/不是合法的 Base64/)
    expect(() => parseBase64Input('aGVs*bG8=')).toThrow(/不是合法的 Base64/)
  })
})

describe('base64ToBytes', () => {
  it('atob 逐字符解码', () => {
    // "hello" = aGVsbG8=
    expect(Array.from(base64ToBytes('aGVsbG8='))).toEqual([104, 101, 108, 108, 111])
    // 空字节串
    expect(base64ToBytes('').length).toBe(0)
  })

  it('真实 PNG 头可还原', () => {
    const bytes = base64ToBytes(PNG_1X1_B64)
    expect(bytes[0]).toBe(0x89)
    expect(bytes[1]).toBe(0x50)
    expect(bytes[2]).toBe(0x4e)
    expect(bytes[3]).toBe(0x47)
  })

  it('非法字符抛错（不依赖 atob 原生英文报错）', () => {
    expect(() => base64ToBytes('aGVs!bG8=')).toThrow(/Base64 解码失败/)
  })
})

describe('sniffMimeFromBytes', () => {
  it('PNG', () => {
    expect(sniffMimeFromBytes(bytesOf(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a))).toBe(
      'image/png',
    )
  })

  it('JPEG', () => {
    expect(sniffMimeFromBytes(bytesOf(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
  })

  it('GIF', () => {
    expect(sniffMimeFromBytes(bytesOf(0x47, 0x49, 0x46, 0x38, 0x39, 0x61))).toBe('image/gif')
  })

  it('WebP（RIFF .... WEBP）', () => {
    expect(
      sniffMimeFromBytes(
        bytesOf(0x52, 0x49, 0x46, 0x46, 0x1a, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50),
      ),
    ).toBe('image/webp')
  })

  it('BMP', () => {
    expect(sniffMimeFromBytes(bytesOf(0x42, 0x4d, 0x36))).toBe('image/bmp')
  })

  it('无法识别默认 image/png（含空/过短字节）', () => {
    expect(sniffMimeFromBytes(bytesOf(1, 2, 3))).toBe('image/png')
    expect(sniffMimeFromBytes(bytesOf())).toBe('image/png')
    // 接近 WebP 但第 8–11 字节不是 WEBP
    expect(sniffMimeFromBytes(bytesOf(0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00, 0x00))).toBe(
      'image/png',
    )
  })

  it('真实 PNG 字节可判定', () => {
    expect(sniffMimeFromBytes(base64ToBytes(PNG_1X1_B64))).toBe('image/png')
  })
})

describe('parseQuality', () => {
  it('空串用默认 80', () => {
    expect(parseQuality('')).toBe(DEFAULT_QUALITY)
    expect(parseQuality('   ')).toBe(DEFAULT_QUALITY)
  })

  it('正常解析', () => {
    expect(parseQuality('1')).toBe(1)
    expect(parseQuality('100')).toBe(100)
    expect(parseQuality(' 85 ')).toBe(85)
  })

  it('非法抛错', () => {
    expect(() => parseQuality('abc')).toThrow(/质量无效/)
    expect(() => parseQuality('85.5')).toThrow(/质量无效/)
    expect(() => parseQuality('0')).toThrow(/超出范围/)
    expect(() => parseQuality('101')).toThrow(/超出范围/)
  })
})

describe('formatToMime / effectiveQuality', () => {
  it('格式转 MIME', () => {
    expect(formatToMime('jpeg')).toBe('image/jpeg')
    expect(formatToMime('png')).toBe('image/png')
  })

  it('PNG 质量不生效', () => {
    expect(effectiveQuality('png', 80)).toBeUndefined()
    expect(effectiveQuality('jpeg', 80)).toBe(0.8)
    expect(effectiveQuality('jpeg', 100)).toBe(1)
  })
})

describe('buildOutputFileName', () => {
  it('按格式定扩展名', () => {
    expect(buildOutputFileName('png')).toBe('base64-image.png')
    expect(buildOutputFileName('jpeg')).toBe('base64-image.jpg')
  })
})
