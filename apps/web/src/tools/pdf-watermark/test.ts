import { describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  DEFAULT_FONT_SIZE,
  DEFAULT_OPACITY,
  DEFAULT_ROTATE,
  DEFAULT_SCALE,
  MAX_FILE_SIZE,
  POSITION_IDS,
  WATERMARK_MARGIN,
  applyImageWatermark,
  applyTextWatermark,
  assertFileSizeOk,
  assertTextWatermarkOk,
  buildOutputFileName,
  computeWatermarkXY,
  detectImageKind,
  errorMessage,
  hexToRgb,
  isEncryptedPdfError,
  isPdfFile,
  parseFontSize,
  parseOpacity,
  parsePageRanges,
  parseRotate,
  parseScale,
  resolvePageIndices,
  tryGetPageCount,
} from './utils'

/** 用真实 pdf-lib 在内存构造测试 PDF */
async function makePdf(pageCount = 3): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  for (let i = 0; i < pageCount; i++) doc.addPage([600, 800])
  const saved: Uint8Array = await doc.save()
  return new Uint8Array(saved)
}

/** 1×1 PNG（base64 解码；node 环境可用 Buffer） */
function makePngBytes(): Uint8Array {
  const b64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
  return new Uint8Array(Buffer.from(b64, 'base64'))
}

/**
 * 按 pdf-lib JpegEmbedder 解析规则手造的最小 JPEG：
 * SOI + SOF0（8bit、1×1、单分量→DeviceGray）+ EOI
 */
function makeJpegBytes(): Uint8Array {
  return new Uint8Array([
    0xff, 0xd8, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff,
    0xd9,
  ])
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
    expect(errorMessage(42)).toBe('42')
  })
})

describe('isPdfFile', () => {
  it('%PDF- 魔数通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
  })

  it('长度不足 5 字节不通过', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44]))).toBe(false)
    expect(isPdfFile(new Uint8Array(0))).toBe(false)
  })

  it('逐字节校验：任一字节不对即不通过', () => {
    const good = [0x25, 0x50, 0x44, 0x46, 0x2d]
    for (let i = 0; i < 5; i++) {
      const bad = [...good]
      bad[i] = 0x58 // 'X'
      expect(isPdfFile(new Uint8Array(bad))).toBe(false)
    }
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

describe('isEncryptedPdfError', () => {
  it('含 is encrypted 的 Error 判定为加密', () => {
    expect(
      isEncryptedPdfError(
        new Error(
          'Input document to `PDFDocument.load` is encrypted. You can use `PDFDocument.load(..., { ignoreEncryption: true })` if you wish to load the document anyways.',
        ),
      ),
    ).toBe(true)
  })

  it('其他错误与非 Error 判定为否', () => {
    expect(isEncryptedPdfError(new Error('损坏'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('tryGetPageCount', () => {
  it('正常 PDF 返回页数', async () => {
    expect(await tryGetPageCount(await makePdf(3))).toBe(3)
  })

  it('损坏字节返回 null（不抛错）', async () => {
    expect(await tryGetPageCount(new Uint8Array([1, 2, 3]))).toBeNull()
  })
})

describe('parseOpacity', () => {
  it('空串用默认 50', () => {
    expect(parseOpacity('')).toBe(DEFAULT_OPACITY)
    expect(parseOpacity('   ')).toBe(DEFAULT_OPACITY)
  })

  it('正常解析', () => {
    expect(parseOpacity('10')).toBe(10)
    expect(parseOpacity('100')).toBe(100)
    expect(parseOpacity(' 75 ')).toBe(75)
  })

  it('非法抛错', () => {
    expect(() => parseOpacity('abc')).toThrow(/透明度无效/)
    expect(() => parseOpacity('50.5')).toThrow(/透明度无效/)
    expect(() => parseOpacity('9')).toThrow(/超出范围/)
    expect(() => parseOpacity('101')).toThrow(/超出范围/)
  })
})

describe('parseFontSize', () => {
  it('空串用默认 48', () => {
    expect(parseFontSize('')).toBe(DEFAULT_FONT_SIZE)
  })

  it('正常解析', () => {
    expect(parseFontSize('8')).toBe(8)
    expect(parseFontSize('200')).toBe(200)
  })

  it('非法抛错', () => {
    expect(() => parseFontSize('abc')).toThrow(/字号无效/)
    expect(() => parseFontSize('7')).toThrow(/超出范围/)
    expect(() => parseFontSize('201')).toThrow(/超出范围/)
  })
})

describe('parseRotate', () => {
  it('空串用默认 45', () => {
    expect(parseRotate('')).toBe(DEFAULT_ROTATE)
  })

  it('正常解析（含负数与小数）', () => {
    expect(parseRotate('-90')).toBe(-90)
    expect(parseRotate('0')).toBe(0)
    expect(parseRotate('45.5')).toBe(45.5)
  })

  it('非法抛错', () => {
    expect(() => parseRotate('abc')).toThrow(/旋转角度无效/)
    expect(() => parseRotate('1-2')).toThrow(/旋转角度无效/)
    expect(() => parseRotate('-181')).toThrow(/超出范围/)
    expect(() => parseRotate('181')).toThrow(/超出范围/)
  })
})

describe('parseScale', () => {
  it('空串用默认 100', () => {
    expect(parseScale('')).toBe(DEFAULT_SCALE)
  })

  it('正常解析', () => {
    expect(parseScale('10')).toBe(10)
    expect(parseScale('200')).toBe(200)
  })

  it('非法抛错', () => {
    expect(() => parseScale('abc')).toThrow(/缩放无效/)
    expect(() => parseScale('9')).toThrow(/超出范围/)
    expect(() => parseScale('201')).toThrow(/超出范围/)
  })
})

describe('parsePageRanges', () => {
  it('空串返回空数组', () => {
    expect(parsePageRanges('', 5)).toEqual([])
    expect(parsePageRanges('   ', 5)).toEqual([])
  })

  it('单页与范围解析（1 起，去重升序）', () => {
    expect(parsePageRanges('2', 5)).toEqual([1])
    expect(parsePageRanges('1-3', 5)).toEqual([0, 1, 2])
    expect(parsePageRanges('1-3,5', 5)).toEqual([0, 1, 2, 4])
    expect(parsePageRanges(' 1 - 2 , 4 ', 5)).toEqual([0, 1, 3])
    expect(parsePageRanges('3,1-2', 5)).toEqual([0, 1, 2])
    expect(parsePageRanges('2,2,1-2', 5)).toEqual([0, 1])
  })

  it('非法抛错', () => {
    expect(() => parsePageRanges('3-1', 5)).toThrow(/起始页大于结束页/)
    expect(() => parsePageRanges('0', 5)).toThrow(/超出范围/)
    expect(() => parsePageRanges('6', 5)).toThrow(/超出范围/)
    expect(() => parsePageRanges('1-6', 5)).toThrow(/超出范围/)
    expect(() => parsePageRanges('abc', 5)).toThrow(/页面范围无效/)
    expect(() => parsePageRanges('1,,2', 5)).toThrow(/页面范围无效/)
    expect(() => parsePageRanges('1-', 5)).toThrow(/页面范围无效/)
  })
})

describe('resolvePageIndices', () => {
  it('all 返回全部页索引', () => {
    expect(resolvePageIndices('all', '', 3)).toEqual([0, 1, 2])
    expect(resolvePageIndices('all', '1', 3)).toEqual([0, 1, 2])
  })

  it('custom 按范围解析；空范围回退为全部', () => {
    expect(resolvePageIndices('custom', '2', 3)).toEqual([1])
    expect(resolvePageIndices('custom', '', 3)).toEqual([0, 1, 2])
  })

  it('无页面抛错', () => {
    expect(() => resolvePageIndices('all', '', 0)).toThrow(/没有页面/)
  })
})

describe('computeWatermarkXY', () => {
  // 页面 600×800，水印 100×50，边距 36
  const cases: Array<[string, { x: number; y: number }]> = [
    ['top-left', { x: 36, y: 714 }],
    ['top', { x: 250, y: 714 }],
    ['top-right', { x: 464, y: 714 }],
    ['left', { x: 36, y: 375 }],
    ['center', { x: 250, y: 375 }],
    ['right', { x: 464, y: 375 }],
    ['bottom-left', { x: 36, y: 36 }],
    ['bottom', { x: 250, y: 36 }],
    ['bottom-right', { x: 464, y: 36 }],
  ]

  it('九宫格九个位置坐标正确', () => {
    for (const [pos, expected] of cases) {
      expect(computeWatermarkXY(600, 800, 100, 50, pos as (typeof POSITION_IDS)[number])).toEqual(
        expected,
      )
    }
    expect(POSITION_IDS).toHaveLength(9)
  })

  it('自定义边距', () => {
    expect(computeWatermarkXY(600, 800, 100, 50, 'bottom-left', 10)).toEqual({ x: 10, y: 10 })
    expect(WATERMARK_MARGIN).toBe(36)
  })

  it('非法尺寸/边距抛错', () => {
    expect(() => computeWatermarkXY(0, 800, 100, 50, 'center')).toThrow(/尺寸无效/)
    expect(() => computeWatermarkXY(600, 800, 100, -1, 'center')).toThrow(/尺寸无效/)
    expect(() => computeWatermarkXY(600, NaN, 100, 50, 'center')).toThrow(/尺寸无效/)
    expect(() => computeWatermarkXY(600, 800, 100, 50, 'center', -1)).toThrow(/边距无效/)
    expect(() => computeWatermarkXY(600, 800, 100, 50, 'center', NaN)).toThrow(/边距无效/)
  })
})

describe('hexToRgb', () => {
  it('正常解析（大小写均可）', () => {
    expect(hexToRgb('#ff0000')).toEqual({ r: 1, g: 0, b: 0 })
    expect(hexToRgb('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(hexToRgb('#FFFFFF')).toEqual({ r: 1, g: 1, b: 1 })
    expect(hexToRgb('  #808080 ')).toEqual({ r: 128 / 255, g: 128 / 255, b: 128 / 255 })
  })

  it('非法抛错', () => {
    expect(() => hexToRgb('ff0000')).toThrow(/颜色无效/)
    expect(() => hexToRgb('#fff')).toThrow(/颜色无效/)
    expect(() => hexToRgb('#gggggg')).toThrow(/颜色无效/)
  })
})

describe('assertTextWatermarkOk', () => {
  it('ASCII 文本通过', () => {
    expect(() => assertTextWatermarkOk('CONFIDENTIAL')).not.toThrow()
    expect(() => assertTextWatermarkOk('Draft-2024_v2.0 (c)')).not.toThrow()
  })

  it('空文本抛错', () => {
    expect(() => assertTextWatermarkOk('')).toThrow(/水印文字不能为空/)
    expect(() => assertTextWatermarkOk('   ')).toThrow(/水印文字不能为空/)
  })

  it('非 ASCII（含中文）抛错', () => {
    expect(() => assertTextWatermarkOk('机密')).toThrow(/仅支持 ASCII/)
    expect(() => assertTextWatermarkOk('Draft 机密')).toThrow(/仅支持 ASCII/)
  })
})

describe('detectImageKind', () => {
  it('PNG 魔数识别', () => {
    expect(detectImageKind(makePngBytes())).toBe('png')
  })

  it('JPEG 魔数识别', () => {
    expect(detectImageKind(makeJpegBytes())).toBe('jpg')
  })

  it('PNG 逐字节校验：任一字节不对即不通过', () => {
    const good = [0x89, 0x50, 0x4e, 0x47]
    for (let i = 0; i < 4; i++) {
      const bad = [...good]
      bad[i] = 0x00
      expect(() => detectImageKind(new Uint8Array(bad))).toThrow(/PNG 或 JPEG/)
    }
  })

  it('JPEG 逐字节校验：任一字节不对即不通过', () => {
    const good = [0xff, 0xd8]
    for (let i = 0; i < 2; i++) {
      const bad = [...good]
      bad[i] = 0x00
      expect(() => detectImageKind(new Uint8Array(bad))).toThrow(/PNG 或 JPEG/)
    }
  })

  it('空字节与文本字节抛错', () => {
    expect(() => detectImageKind(new Uint8Array(0))).toThrow(/PNG 或 JPEG/)
    expect(() => detectImageKind(new Uint8Array([104, 101, 108, 108, 111]))).toThrow(/PNG 或 JPEG/)
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -watermarked 后缀', () => {
    expect(buildOutputFileName('report.pdf')).toBe('report-watermarked.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-watermarked.pdf')
  })

  it('空名兜底', () => {
    expect(buildOutputFileName('')).toBe('document-watermarked.pdf')
    expect(buildOutputFileName('.pdf')).toBe('document-watermarked.pdf')
  })
})

describe('applyTextWatermark（真实 pdf-lib）', () => {
  const baseParams = {
    text: 'CONFIDENTIAL',
    fontSize: 48,
    colorHex: '#808080',
    opacity: 0.5,
    rotate: 45,
    position: 'center' as const,
    pageMode: 'all' as const,
    pageRange: '',
  }

  it('全部页面加水印后页数不变、可重新解析', async () => {
    const out = await applyTextWatermark(await makePdf(3), baseParams)
    expect(out.length).toBeGreaterThan(0)
    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getPageCount()).toBe(3)
  })

  it('自定义页面范围', async () => {
    const out = await applyTextWatermark(await makePdf(3), {
      ...baseParams,
      pageMode: 'custom',
      pageRange: '2',
    })
    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getPageCount()).toBe(3)
  })

  it('各位置与旋转均可绘制', async () => {
    for (const position of POSITION_IDS) {
      const out = await applyTextWatermark(await makePdf(1), {
        ...baseParams,
        position,
        rotate: -90,
      })
      expect(out.length).toBeGreaterThan(0)
    }
  })

  it('空文本/中文文本/非法颜色/非法范围抛错', async () => {
    const pdf = await makePdf(1)
    await expect(applyTextWatermark(pdf, { ...baseParams, text: '' })).rejects.toThrow(
      /水印文字不能为空/,
    )
    await expect(applyTextWatermark(pdf, { ...baseParams, text: '机密' })).rejects.toThrow(
      /仅支持 ASCII/,
    )
    await expect(applyTextWatermark(pdf, { ...baseParams, colorHex: 'red' })).rejects.toThrow(
      /颜色无效/,
    )
    await expect(
      applyTextWatermark(pdf, { ...baseParams, pageMode: 'custom', pageRange: '9' }),
    ).rejects.toThrow(/超出范围/)
  })
})

describe('applyImageWatermark（真实 pdf-lib）', () => {
  it('PNG 水印：全部页面', async () => {
    const out = await applyImageWatermark(await makePdf(2), {
      imageBytes: makePngBytes(),
      imageKind: 'png',
      scale: 100,
      opacity: 0.5,
      position: 'bottom-right',
      pageMode: 'all',
      pageRange: '',
    })
    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getPageCount()).toBe(2)
  })

  it('JPEG 水印：自定义页面', async () => {
    const out = await applyImageWatermark(await makePdf(3), {
      imageBytes: makeJpegBytes(),
      imageKind: 'jpg',
      scale: 50,
      opacity: 0.8,
      position: 'top-left',
      pageMode: 'custom',
      pageRange: '1-2',
    })
    const reloaded = await PDFDocument.load(out)
    expect(reloaded.getPageCount()).toBe(3)
  })

  it('空图片字节抛错', async () => {
    await expect(
      applyImageWatermark(await makePdf(1), {
        imageBytes: new Uint8Array(0),
        imageKind: 'png',
        scale: 100,
        opacity: 0.5,
        position: 'center',
        pageMode: 'all',
        pageRange: '',
      }),
    ).rejects.toThrow(/水印图片为空/)
  })
})
