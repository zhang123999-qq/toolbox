import { describe, expect, it } from 'vitest'
import { ImageKind, OPS } from 'pdfjs-dist'
import {
  MAX_FILE_SIZE,
  MAX_IMAGES,
  MAX_IMAGE_DIMENSION,
  assertFileSizeOk,
  assertImageSizeOk,
  buildImageFileName,
  collectImageRefs,
  errorMessage,
  formatToMime,
  isEncryptedPdfError,
  isImageDataLike,
  isPdfFile,
  normalizeToRgba,
} from './utils'
import type { OperatorListLike, PdfImageDataLike } from './utils'

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  const pdfHead = [0x25, 0x50, 0x44, 0x46, 0x2d]

  it('合法的 %PDF- 头返回 true', () => {
    expect(isPdfFile(new Uint8Array([...pdfHead, 0x31, 0x2e, 0x37]))).toBe(true)
  })

  it('长度不足 5 返回 false', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
  })

  it.each([
    [0x00, 0x50, 0x44, 0x46, 0x2d],
    [0x25, 0x00, 0x44, 0x46, 0x2d],
    [0x25, 0x50, 0x00, 0x46, 0x2d],
    [0x25, 0x50, 0x44, 0x00, 0x2d],
    [0x25, 0x50, 0x44, 0x46, 0x00],
  ])('魔数第 %i 个字节不符返回 false', (...bytes) => {
    expect(isPdfFile(new Uint8Array(bytes))).toBe(false)
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

describe('assertImageSizeOk', () => {
  it('合法尺寸不抛错', () => {
    expect(() => assertImageSizeOk(800, 600)).not.toThrow()
  })

  it('非法尺寸抛错', () => {
    expect(() => assertImageSizeOk(0, 600)).toThrow(/尺寸无效或超限/)
    expect(() => assertImageSizeOk(800, -1)).toThrow(/尺寸无效或超限/)
    expect(() => assertImageSizeOk(NaN, 600)).toThrow(/尺寸无效或超限/)
    expect(() => assertImageSizeOk(800.5, 600)).toThrow(/尺寸无效或超限/)
    expect(() => assertImageSizeOk(800, 600.5)).toThrow(/尺寸无效或超限/)
  })

  it('单边超限抛错', () => {
    expect(() => assertImageSizeOk(MAX_IMAGE_DIMENSION + 1, 100)).toThrow(/尺寸无效或超限/)
    expect(() => assertImageSizeOk(100, MAX_IMAGE_DIMENSION + 1)).toThrow(/尺寸无效或超限/)
  })
})

describe('isEncryptedPdfError', () => {
  it('PasswordException 按 name 识别', () => {
    const err = new Error('No password given')
    err.name = 'PasswordException'
    expect(isEncryptedPdfError(err)).toBe(true)
  })

  it('message 含 password 时识别', () => {
    expect(isEncryptedPdfError(new Error('Incorrect Password'))).toBe(true)
  })

  it('普通错误返回 false', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF structure'))).toBe(false)
  })

  it('非 Error 返回 false', () => {
    expect(isEncryptedPdfError('password')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('formatToMime', () => {
  it('png/jpeg 转 MIME', () => {
    expect(formatToMime('png')).toBe('image/png')
    expect(formatToMime('jpeg')).toBe('image/jpeg')
  })
})

describe('buildImageFileName', () => {
  it('原名-p{页码}-img{序号}.扩展名', () => {
    expect(buildImageFileName('report.pdf', 2, 3, 'png')).toBe('report-p2-img3.png')
    expect(buildImageFileName('report.pdf', 1, 1, 'jpeg')).toBe('report-p1-img1.jpg')
  })

  it('无扩展名原样拼接', () => {
    expect(buildImageFileName('doc', 1, 1, 'png')).toBe('doc-p1-img1.png')
  })

  it('空基名兜底为 pdf', () => {
    expect(buildImageFileName('.pdf', 1, 1, 'png')).toBe('pdf-p1-img1.png')
  })
})

describe('isImageDataLike', () => {
  const valid = {
    width: 10,
    height: 10,
    kind: ImageKind.RGBA_32BPP,
    data: new Uint8ClampedArray(400),
  }

  it('合法对象返回 true', () => {
    expect(isImageDataLike(valid)).toBe(true)
  })

  it('非对象返回 false', () => {
    expect(isImageDataLike(null)).toBe(false)
    expect(isImageDataLike('img')).toBe(false)
    expect(isImageDataLike(undefined)).toBe(false)
  })

  it('尺寸非法返回 false', () => {
    expect(isImageDataLike({ ...valid, width: 0 })).toBe(false)
    expect(isImageDataLike({ ...valid, width: NaN })).toBe(false)
    expect(isImageDataLike({ ...valid, width: '10' })).toBe(false)
    expect(isImageDataLike({ ...valid, height: -1 })).toBe(false)
  })

  it('data 缺失或为空返回 false', () => {
    expect(isImageDataLike({ width: 10, height: 10 })).toBe(false)
    expect(isImageDataLike({ ...valid, data: null })).toBe(false)
    expect(isImageDataLike({ ...valid, data: {} })).toBe(false)
    expect(isImageDataLike({ ...valid, data: new Uint8Array(0) })).toBe(false)
  })
})

describe('collectImageRefs', () => {
  const PAINT = OPS.paintImageXObject
  const INLINE = OPS.paintInlineImageXObject

  it('命名图片：收集对象名', () => {
    const refs = collectImageRefs({ fnArray: [PAINT], argsArray: [['img_12']] })
    expect(refs).toEqual([{ kind: 'named', name: 'img_12' }])
  })

  it('命名图片：args[0] 非字符串（如蒙版包装对象）被滤掉', () => {
    const refs = collectImageRefs({ fnArray: [PAINT], argsArray: [[{ data: 'img_x' }]] })
    expect(refs).toEqual([])
  })

  it('命名图片：空字符串名被滤掉', () => {
    const refs = collectImageRefs({ fnArray: [PAINT], argsArray: [['']] })
    expect(refs).toEqual([])
  })

  it('内联图片：直接收集图片对象', () => {
    const image = { width: 10, height: 10, data: new Uint8Array(300) }
    const refs = collectImageRefs({ fnArray: [INLINE], argsArray: [[image]] })
    expect(refs).toEqual([{ kind: 'inline', image }])
  })

  it('内联图片：数据非法被滤掉', () => {
    const refs = collectImageRefs({ fnArray: [INLINE], argsArray: [[{ width: 0 }]] })
    expect(refs).toEqual([])
  })

  it('未知操作被忽略', () => {
    const refs = collectImageRefs({ fnArray: [1], argsArray: [[{}]] })
    expect(refs).toEqual([])
  })

  it('args 非数组或空数组被跳过', () => {
    const badArgs = {
      fnArray: [PAINT, PAINT],
      argsArray: [null, []],
    } as unknown as OperatorListLike
    expect(collectImageRefs(badArgs)).toEqual([])
  })

  it('fnArray 与 argsArray 长度不一致时按较短者处理', () => {
    const refs = collectImageRefs({ fnArray: [PAINT, PAINT], argsArray: [['a']] })
    expect(refs).toEqual([{ kind: 'named', name: 'a' }])
  })

  it('保持出现顺序', () => {
    const inline = { width: 2, height: 2, data: new Uint8Array(12) }
    const refs = collectImageRefs({
      fnArray: [PAINT, INLINE, PAINT],
      argsArray: [['n1'], [inline], ['n2']],
    })
    expect(refs).toEqual([
      { kind: 'named', name: 'n1' },
      { kind: 'inline', image: inline },
      { kind: 'named', name: 'n2' },
    ])
  })
})

describe('normalizeToRgba', () => {
  const img = (partial: Partial<PdfImageDataLike>): PdfImageDataLike => ({
    width: 2,
    height: 1,
    kind: ImageKind.RGBA_32BPP,
    data: new Uint8ClampedArray(8),
    ...partial,
  })

  it('RGBA_32BPP：按 kind 直接拷贝', () => {
    const data = new Uint8ClampedArray([1, 2, 3, 4, 5, 6, 7, 8])
    const out = normalizeToRgba(img({ data }))
    expect(out.width).toBe(2)
    expect(out.height).toBe(1)
    expect(Array.from(out.rgba)).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(out.rgba).not.toBe(data)
  })

  it('无 kind 时按长度回退判定为 RGBA', () => {
    const out = normalizeToRgba(img({ kind: undefined, data: new Uint8Array(8).fill(7) }))
    expect(Array.from(out.rgba)).toEqual(new Array(8).fill(7))
  })

  it('RGBA 数据截断抛错', () => {
    expect(() => normalizeToRgba(img({ data: new Uint8ClampedArray(4) }))).toThrow(/长度不足/)
  })

  it('RGB_24BPP：按 kind 补 alpha=255', () => {
    const out = normalizeToRgba(
      img({ kind: ImageKind.RGB_24BPP, data: new Uint8Array([1, 2, 3, 4, 5, 6]) }),
    )
    expect(Array.from(out.rgba)).toEqual([1, 2, 3, 255, 4, 5, 6, 255])
  })

  it('无 kind 时按长度回退判定为 RGB', () => {
    const out = normalizeToRgba(img({ kind: undefined, data: new Uint8Array(6).fill(9) }))
    expect(Array.from(out.rgba)).toEqual([9, 9, 9, 255, 9, 9, 9, 255])
  })

  it('RGB 数据截断抛错', () => {
    expect(() =>
      normalizeToRgba(img({ kind: ImageKind.RGB_24BPP, data: new Uint8Array(3) })),
    ).toThrow(/长度不足/)
  })

  it('GRAYSCALE_1BPP：bit=1 为白、0 为黑（MSB 在前）', () => {
    // 0b10100000 → 白 黑 白 黑 黑 黑 黑 黑
    const out = normalizeToRgba(
      img({ width: 8, height: 1, kind: ImageKind.GRAYSCALE_1BPP, data: new Uint8Array([0xa0]) }),
    )
    expect(out.width).toBe(8)
    const px = (i: number): number[] => Array.from(out.rgba.slice(i * 4, i * 4 + 4))
    expect(px(0)).toEqual([255, 255, 255, 255])
    expect(px(1)).toEqual([0, 0, 0, 255])
    expect(px(2)).toEqual([255, 255, 255, 255])
    expect(px(7)).toEqual([0, 0, 0, 255])
  })

  it('GRAYSCALE_1BPP：行尾不足一字节时按 stride 对齐', () => {
    // 宽 10 → stride 2；第二字节 0x80 → x8 为白、x9 为黑
    const out = normalizeToRgba(
      img({
        width: 10,
        height: 1,
        kind: ImageKind.GRAYSCALE_1BPP,
        data: new Uint8Array([0xff, 0x80]),
      }),
    )
    const px = (i: number): number => out.rgba[i * 4]
    expect(px(7)).toBe(255)
    expect(px(8)).toBe(255)
    expect(px(9)).toBe(0)
  })

  it('GRAYSCALE_1BPP 数据截断抛错', () => {
    expect(() =>
      normalizeToRgba(
        img({ width: 8, height: 2, kind: ImageKind.GRAYSCALE_1BPP, data: new Uint8Array([0xff]) }),
      ),
    ).toThrow(/长度不足/)
  })

  it('非法尺寸抛错', () => {
    expect(() => normalizeToRgba(img({ width: 0 }))).toThrow(/尺寸无效/)
    expect(() => normalizeToRgba(img({ width: 1.5 }))).toThrow(/尺寸无效/)
    expect(() => normalizeToRgba(img({ height: -2 }))).toThrow(/尺寸无效/)
  })

  it('未知 kind 且长度对不上抛错', () => {
    expect(() => normalizeToRgba(img({ kind: 99, data: new Uint8Array(5) }))).toThrow(/不支持/)
  })
})

describe('常量', () => {
  it('上限常量符合预期', () => {
    expect(MAX_FILE_SIZE).toBe(50 * 1024 * 1024)
    expect(MAX_IMAGES).toBe(200)
    expect(MAX_IMAGE_DIMENSION).toBe(16384)
  })
})
