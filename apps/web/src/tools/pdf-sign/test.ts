import { beforeAll, describe, expect, it } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import {
  MAX_FILE_SIZE,
  assertFileSizeOk,
  buildOutputFileName,
  computeSignatureRect,
  dataUrlToBytes,
  detectImageKind,
  embedSignature,
  errorMessage,
  getJpegDimensions,
  getPdfInfo,
  getPngDimensions,
  isEncryptedPdfError,
  isPdfFile,
  parsePageIndex,
  parseSliderValue,
  toCanvasPoint,
} from './utils'

/** 真实有效的 1x1 透明 PNG（CRC 正确，可被 pdf-lib 完整解析） */
const PNG_1X1_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

/** 手工构造 PNG 文件头（仅 IHDR，供 getPngDimensions 解析） */
function pngBytes(width: number, height: number): Uint8Array {
  const b = new Uint8Array(32)
  b.set([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  ])
  b[16] = (width >>> 24) & 0xff
  b[17] = (width >>> 16) & 0xff
  b[18] = (width >>> 8) & 0xff
  b[19] = width & 0xff
  b[20] = (height >>> 24) & 0xff
  b[21] = (height >>> 16) & 0xff
  b[22] = (height >>> 8) & 0xff
  b[23] = height & 0xff
  return b
}

/** 带长度段的 JPEG 标记：FF marker len(2) payload */
function jpegSeg(marker: number, payload: number[]): Uint8Array {
  const len = payload.length + 2
  return new Uint8Array([0xff, marker, (len >>> 8) & 0xff, len & 0xff, ...payload])
}

/** 无长度段的独立 JPEG 标记 */
function jpegStandalone(marker: number): Uint8Array {
  return new Uint8Array([0xff, marker])
}

/** SOF0 段（携带宽高） */
function jpegSof0(width: number, height: number): Uint8Array {
  return jpegSeg(0xc0, [
    8,
    (height >>> 8) & 0xff,
    height & 0xff,
    (width >>> 8) & 0xff,
    width & 0xff,
    1,
    1,
    0x11,
    0,
  ])
}

/** SOI + 若干段拼成最小 JPEG */
function jpegFile(segments: Uint8Array[]): Uint8Array {
  const total = 2 + segments.reduce((n, s) => n + s.length, 0)
  const out = new Uint8Array(total)
  out[0] = 0xff
  out[1] = 0xd8
  let o = 2
  for (const s of segments) {
    out.set(s, o)
    o += s.length
  }
  return out
}

let twoPagePdf: Uint8Array

beforeAll(async () => {
  const doc = await PDFDocument.create()
  doc.addPage([600, 800])
  doc.addPage([600, 800])
  twoPagePdf = await doc.save()
})

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('isPdfFile', () => {
  it('识别 %PDF- 魔数', () => {
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]))).toBe(true)
    expect(isPdfFile(twoPagePdf)).toBe(true)
  })

  it('拒绝非 PDF', () => {
    expect(isPdfFile(new Uint8Array([]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x00, 0x50, 0x44, 0x46, 0x2d]))).toBe(false)
    expect(isPdfFile(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x00]))).toBe(false)
    expect(isPdfFile(new TextEncoder().encode('hello'))).toBe(false)
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
  it('按 message 识别 pdf-lib 加密错误（原型链断裂，instanceof 不可用）', () => {
    expect(
      isEncryptedPdfError(new Error('Input document to `PDFDocument.load` is encrypted.')),
    ).toBe(true)
  })

  it('非加密错误返回 false', () => {
    expect(isEncryptedPdfError(new Error('Invalid PDF structure'))).toBe(false)
    expect(isEncryptedPdfError('is encrypted')).toBe(false)
    expect(isEncryptedPdfError(null)).toBe(false)
  })
})

describe('detectImageKind', () => {
  it('识别 PNG', () => {
    expect(detectImageKind(pngBytes(10, 10))).toBe('png')
  })

  it('识别 JPEG', () => {
    expect(detectImageKind(jpegFile([jpegSof0(10, 10)]))).toBe('jpg')
  })

  it('非 PNG/JPEG 返回 null', () => {
    expect(detectImageKind(new TextEncoder().encode('GIF89a'))).toBeNull()
    expect(detectImageKind(new Uint8Array([]))).toBeNull()
  })
})

describe('getPngDimensions', () => {
  it('解析 IHDR 宽高', () => {
    expect(getPngDimensions(pngBytes(120, 40))).toEqual({ width: 120, height: 40 })
  })

  it('文件过短抛错', () => {
    expect(() => getPngDimensions(new Uint8Array(10))).toThrow(/过短/)
  })

  it('魔数不对抛错', () => {
    const b = pngBytes(10, 10)
    b[0] = 0x00
    expect(() => getPngDimensions(b)).toThrow(/非 PNG/)
  })

  it('IHDR 长度异常抛错', () => {
    const b = pngBytes(10, 10)
    b[11] = 0x0e
    expect(() => getPngDimensions(b)).toThrow(/IHDR/)
  })

  it('IHDR 类型异常抛错', () => {
    const b = pngBytes(10, 10)
    b[12] = 0x49 // 'I'→ 仍 'IHDR'? 改一个字节破坏类型
    b[13] = 0x58 // 'X'
    expect(() => getPngDimensions(b)).toThrow(/IHDR/)
  })

  it('宽高为 0 抛错', () => {
    expect(() => getPngDimensions(pngBytes(0, 10))).toThrow(/尺寸异常/)
    expect(() => getPngDimensions(pngBytes(10, 0))).toThrow(/尺寸异常/)
  })
})

describe('getJpegDimensions', () => {
  const app0 = () => jpegSeg(0xe0, new Array(14).fill(0))

  it('跳过 APP0 解析 SOF0 宽高', () => {
    expect(getJpegDimensions(jpegFile([app0(), jpegSof0(300, 200)]))).toEqual({
      width: 300,
      height: 200,
    })
  })

  it('非 JPEG 抛错', () => {
    expect(() => getJpegDimensions(new Uint8Array([0x00, 0xd8, 0xff, 0xe0]))).toThrow(/非 JPEG/)
    expect(() => getJpegDimensions(new Uint8Array([0xff, 0xd8]))).toThrow(/非 JPEG/)
  })

  it('段消耗完后数据截断抛错', () => {
    // SOI + 独立标记 FF01（offset 前进到 4，恰为文件末尾）→ 循环顶部截断
    expect(() => getJpegDimensions(new Uint8Array([0xff, 0xd8, 0xff, 0x01]))).toThrow(/截断/)
  })

  it('标记头不是 0xFF 抛错', () => {
    expect(() => getJpegDimensions(jpegFile([new Uint8Array([0x00, 0x00])]))).toThrow(/标记错误/)
  })

  it('SOF 段截断抛错', () => {
    // FF C0 len=3 payload 只有 1 字节，不足以读出宽高
    const truncated = new Uint8Array([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x03, 0x08])
    expect(() => getJpegDimensions(truncated)).toThrow(/截断/)
  })

  it('宽高为 0 抛错', () => {
    expect(() => getJpegDimensions(jpegFile([jpegSof0(0, 200)]))).toThrow(/尺寸异常/)
    expect(() => getJpegDimensions(jpegFile([jpegSof0(300, 0)]))).toThrow(/尺寸异常/)
  })

  it('EOI 前无 SOF 抛错', () => {
    expect(() => getJpegDimensions(jpegFile([jpegStandalone(0xd9)]))).toThrow(/未找到尺寸信息/)
  })

  it('跳过无长度段的独立标记（TEM/RST）', () => {
    expect(
      getJpegDimensions(jpegFile([jpegStandalone(0x01), jpegStandalone(0xd0), jpegSof0(10, 20)])),
    ).toEqual({ width: 10, height: 20 })
  })

  it('跳过 SOF 排除标记（DHT/DAC/JPG）', () => {
    expect(
      getJpegDimensions(
        jpegFile([
          jpegSeg(0xc4, [1, 2, 3]),
          jpegSeg(0xc8, [1, 2, 3]),
          jpegSeg(0xcc, [1, 2, 3]),
          jpegSof0(10, 20),
        ]),
      ),
    ).toEqual({ width: 10, height: 20 })
  })

  it('段长度非法抛错', () => {
    const bad = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x01])
    expect(() => getJpegDimensions(bad)).toThrow(/段长度错误/)
  })
})

describe('dataUrlToBytes', () => {
  it('解码无填充/单填充/双填充', () => {
    expect(Array.from(dataUrlToBytes('data:image/png;base64,TWFu'))).toEqual([77, 97, 110])
    expect(Array.from(dataUrlToBytes('data:image/png;base64,TWE='))).toEqual([77, 97])
    expect(Array.from(dataUrlToBytes('data:image/png;base64,TQ=='))).toEqual([77])
  })

  it('容忍空白字符', () => {
    expect(Array.from(dataUrlToBytes('data:image/png;base64,T\nW Fu'))).toEqual([77, 97, 110])
  })

  it('缺少分隔符抛错', () => {
    expect(() => dataUrlToBytes('not-a-data-url')).toThrow(/分隔符/)
  })

  it('非 base64 编码抛错', () => {
    expect(() => dataUrlToBytes('data:text/plain,hello')).toThrow(/base64/)
  })

  it('空载荷与长度错误抛错', () => {
    expect(() => dataUrlToBytes('data:image/png;base64,')).toThrow(/长度错误/)
    expect(() => dataUrlToBytes('data:image/png;base64,abc')).toThrow(/长度错误/)
  })

  it('非法字符按位置抛错', () => {
    for (const bad of ['!!!=', 'T!!=', 'TW!=', 'TWF!']) {
      expect(() => dataUrlToBytes(`data:image/png;base64,${bad}`)).toThrow(/非法字符/)
    }
  })

  it('可解码真实 1x1 PNG（与 detectImageKind/getPngDimensions 联动）', () => {
    const bytes = dataUrlToBytes(`data:image/png;base64,${PNG_1X1_B64}`)
    expect(detectImageKind(bytes)).toBe('png')
    expect(getPngDimensions(bytes)).toEqual({ width: 1, height: 1 })
  })
})

describe('parsePageIndex', () => {
  it('1 起转 0 起', () => {
    expect(parsePageIndex('1', 3)).toBe(0)
    expect(parsePageIndex('3', 3)).toBe(2)
    expect(parsePageIndex(' 2 ', 3)).toBe(1)
  })

  it('非法抛错', () => {
    expect(() => parsePageIndex('abc', 3)).toThrow(/页码无效/)
    expect(() => parsePageIndex('0', 3)).toThrow(/超出范围/)
    expect(() => parsePageIndex('4', 3)).toThrow(/超出范围/)
  })
})

describe('parseSliderValue', () => {
  it('正常解析（含小数）', () => {
    expect(parseSliderValue('50', '测试', 0, 100)).toBe(50)
    expect(parseSliderValue('12.5', '测试', 0, 100)).toBe(12.5)
  })

  it('空串/非数字抛错', () => {
    expect(() => parseSliderValue('', '测试', 0, 100)).toThrow(/无效/)
    expect(() => parseSliderValue('abc', '测试', 0, 100)).toThrow(/无效/)
    expect(() => parseSliderValue('-1', '测试', 0, 100)).toThrow(/无效/)
  })

  it('越界抛错', () => {
    expect(() => parseSliderValue('101', '测试', 0, 100)).toThrow(/超出范围/)
    expect(() => parseSliderValue('5', '缩放', 10, 300)).toThrow(/超出范围/)
  })
})

describe('toCanvasPoint', () => {
  const rect = { left: 10, top: 20, width: 300, height: 100 }

  it('等比映射客户端坐标到画布分辨率', () => {
    expect(toCanvasPoint(160, 70, rect, 600, 200)).toEqual({ x: 300, y: 100 })
  })

  it('rect 零宽高时返回原点（无异常分支）', () => {
    expect(toCanvasPoint(160, 70, { ...rect, width: 0 }, 600, 200)).toEqual({ x: 0, y: 0 })
    expect(toCanvasPoint(160, 70, { ...rect, height: 0 }, 600, 200)).toEqual({ x: 0, y: 0 })
  })

  it('越界坐标钳制到画布内', () => {
    expect(toCanvasPoint(1000, -50, rect, 600, 200)).toEqual({ x: 600, y: 0 })
  })
})

describe('computeSignatureRect', () => {
  it('常规落点：左上角按百分比定位，y 换算为 PDF 坐标系', () => {
    // A4 595x842，签名 600x200 按 40% 缩放 → 240x80，x=65%, y=80%
    const r = computeSignatureRect(595, 842, 600, 200, 65, 80, 40)
    expect(r.width).toBeCloseTo(240, 6)
    expect(r.height).toBeCloseTo(80, 6)
    expect(r.x).toBeCloseTo((595 - 240) * 0.65, 6)
    // y = 页高 - 距顶 - 签名高
    expect(r.y).toBeCloseTo(842 - (842 - 80) * 0.8 - 80, 6)
  })

  it('缩放后超宽/超高时等比收缩到页面内', () => {
    const wide = computeSignatureRect(100, 100, 600, 200, 0, 0, 100)
    expect(wide.width).toBeCloseTo(100, 6)
    expect(wide.height).toBeCloseTo(100 / 3, 6)
    const tall = computeSignatureRect(100, 100, 50, 400, 0, 0, 100)
    expect(tall.width).toBeCloseTo(12.5, 6)
    expect(tall.height).toBeCloseTo(100, 6)
  })

  it('四角：0,0 贴左上；100,100 贴右下且不溢出', () => {
    const tl = computeSignatureRect(595, 842, 240, 80, 0, 0, 100)
    expect(tl.x).toBe(0)
    expect(tl.y).toBeCloseTo(842 - 80, 6)
    const br = computeSignatureRect(595, 842, 240, 80, 100, 100, 100)
    expect(br.x).toBeCloseTo(595 - 240, 6)
    expect(br.y).toBe(0)
  })

  it('非法输入抛错', () => {
    expect(() => computeSignatureRect(NaN, 842, 240, 80, 0, 0, 100)).toThrow(/页面宽度/)
    expect(() => computeSignatureRect(595, 842, 240, 0, 0, 0, 100)).toThrow(/签名高度/)
    expect(() => computeSignatureRect(595, 842, 240, 80, 101, 0, 100)).toThrow(/超出范围/)
    expect(() => computeSignatureRect(595, 842, 240, 80, 0, -1, 100)).toThrow(/超出范围/)
    expect(() => computeSignatureRect(595, 842, 240, 80, 0, 0, 0)).toThrow(/缩放无效/)
  })
})

describe('buildOutputFileName', () => {
  it('原名加 -signed 后缀', () => {
    expect(buildOutputFileName('contract.pdf')).toBe('contract-signed.pdf')
    expect(buildOutputFileName('a.PDF')).toBe('a-signed.pdf')
    expect(buildOutputFileName('noext')).toBe('noext-signed.pdf')
  })

  it('空基名兜底为 signed', () => {
    expect(buildOutputFileName('.pdf')).toBe('signed-signed.pdf')
    expect(buildOutputFileName('')).toBe('signed-signed.pdf')
  })
})

describe('getPdfInfo（真实 pdf-lib）', () => {
  it('读取页数与每页尺寸', async () => {
    const info = await getPdfInfo(twoPagePdf)
    expect(info.pageCount).toBe(2)
    expect(info.pages).toEqual([
      { width: 600, height: 800 },
      { width: 600, height: 800 },
    ])
  })

  it('损坏的 PDF 抛错（调用方转译）', async () => {
    const garbage = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x99, 0x88])
    await expect(getPdfInfo(garbage)).rejects.toThrow()
  })
})

describe('embedSignature（真实 pdf-lib）', () => {
  const sigPng = () => dataUrlToBytes(`data:image/png;base64,${PNG_1X1_B64}`)

  it('在指定页嵌入签名，输出为合法 PDF 且页数不变', async () => {
    const rect = computeSignatureRect(600, 800, 1, 1, 50, 50, 100)
    const out = await embedSignature(twoPagePdf, { kind: 'png', data: sigPng() }, 1, rect)
    expect(isPdfFile(out)).toBe(true)
    const doc = await PDFDocument.load(out)
    expect(doc.getPageCount()).toBe(2)
  })

  it('页码越界/非法抛错', async () => {
    const rect = computeSignatureRect(600, 800, 1, 1, 0, 0, 100)
    const sig = { kind: 'png' as const, data: sigPng() }
    await expect(embedSignature(twoPagePdf, sig, 5, rect)).rejects.toThrow(/页码超出范围/)
    await expect(embedSignature(twoPagePdf, sig, -1, rect)).rejects.toThrow(/页码超出范围/)
    await expect(embedSignature(twoPagePdf, sig, 1.5, rect)).rejects.toThrow(/页码超出范围/)
  })
})
