import { describe, expect, it } from 'vitest'
import {
  HEAD_BYTES,
  MAX_FILE_SIZE,
  MAX_FILES,
  assertFileCountOk,
  assertFileSizeOk,
  buildReportText,
  checkConsistency,
  conclusionText,
  detectFormatByMagic,
  errorMessage,
  extensionToFormat,
  formatLabel,
  getExtension,
  type ReportLabels,
} from './utils'

const LABELS: ReportLabels = {
  title: '图片格式检测报告',
  fileLabel: '文件',
  declaredLabel: '声明类型',
  detectedLabel: '检测格式',
  conclusionLabel: '结论',
  summaryPrefix: '共 ',
  summaryUnit: ' 个文件',
  matchText: '一致 ✓',
  mismatchText: '扩展名与内容不符 ⚠',
  unrecognizedText: '无法识别 ✗',
  noextText: '无扩展名，仅报告检测格式',
  unknownFormat: '未知',
  noExtension: '无扩展名',
}

describe('errorMessage', () => {
  it('Error 取 message，非 Error 取 String(err)', () => {
    expect(errorMessage(new Error('出错了'))).toBe('出错了')
    expect(errorMessage('字符串错误')).toBe('字符串错误')
  })
})

describe('detectFormatByMagic', () => {
  it('识别 PNG', () => {
    const head = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    expect(detectFormatByMagic(head)).toBe('png')
  })

  it('识别 JPEG', () => {
    expect(detectFormatByMagic(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3]))).toBe('jpeg')
  })

  it('识别 GIF（GIF8）', () => {
    const head = new Uint8Array(12)
    head.set([0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    expect(detectFormatByMagic(head)).toBe('gif')
  })

  it('识别 WebP（RIFF....WEBP）', () => {
    const head = new Uint8Array(12)
    head.set([0x52, 0x49, 0x46, 0x46, 0x1a, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])
    expect(detectFormatByMagic(head)).toBe('webp')
  })

  it('识别 BMP', () => {
    expect(detectFormatByMagic(new Uint8Array([0x42, 0x4d, 0x36, 0, 0, 0]))).toBe('bmp')
  })

  it('识别 ICO', () => {
    expect(detectFormatByMagic(new Uint8Array([0x00, 0x00, 0x01, 0x00, 1, 0]))).toBe('ico')
  })

  it('识别 AVIF（ftyp + brand 含 avif）', () => {
    const head = new Uint8Array(12)
    // box size(4) + "ftyp" + brand "avif"
    head.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x61, 0x76, 0x69, 0x66])
    expect(detectFormatByMagic(head)).toBe('avif')
  })

  it('ftyp 但 brand 非 avif 时不判为 AVIF', () => {
    const head = new Uint8Array(12)
    // brand "mif1"
    head.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6d, 0x69, 0x66, 0x31])
    expect(detectFormatByMagic(head)).toBe('unknown')
  })

  it('识别 SVG（文本头含 <svg）', () => {
    const text = '<svg xmlns='
    const head = new Uint8Array(text.length)
    for (let i = 0; i < text.length; i++) head[i] = text.charCodeAt(i)
    expect(detectFormatByMagic(head)).toBe('svg')
  })

  it('未知魔数返回 unknown', () => {
    expect(detectFormatByMagic(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]))).toBe('unknown')
  })

  it('空字节返回 unknown', () => {
    expect(detectFormatByMagic(new Uint8Array(0))).toBe('unknown')
  })

  it('截断字节不误判（长度不足）', () => {
    // PNG 签名只有前 4 字节
    expect(detectFormatByMagic(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe('unknown')
    // JPEG 只有前 2 字节
    expect(detectFormatByMagic(new Uint8Array([0xff, 0xd8]))).toBe('unknown')
    // GIF 只有前 3 字节
    expect(detectFormatByMagic(new Uint8Array([0x47, 0x49, 0x46]))).toBe('unknown')
    // BMP 只有 1 字节
    expect(detectFormatByMagic(new Uint8Array([0x42]))).toBe('unknown')
    // ICO 只有 2 字节
    expect(detectFormatByMagic(new Uint8Array([0x00, 0x00]))).toBe('unknown')
    // WebP 只有 RIFF 部分（8 字节，无 WEBP 尾）
    const riffOnly = new Uint8Array(8)
    riffOnly.set([0x52, 0x49, 0x46, 0x46, 0x1a, 0, 0, 0])
    expect(detectFormatByMagic(riffOnly)).toBe('unknown')
    // AVIF 只有 size+ftyp（8 字节，无 brand）
    const ftypOnly = new Uint8Array(8)
    ftypOnly.set([0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70])
    expect(detectFormatByMagic(ftypOnly)).toBe('unknown')
  })

  it('HEAD_BYTES 覆盖 WebP/AVIF 所需长度', () => {
    expect(HEAD_BYTES).toBe(12)
  })
})

describe('extensionToFormat', () => {
  it('常见扩展名映射', () => {
    expect(extensionToFormat('png')).toBe('png')
    expect(extensionToFormat('jpg')).toBe('jpeg')
    expect(extensionToFormat('jpeg')).toBe('jpeg')
    expect(extensionToFormat('gif')).toBe('gif')
    expect(extensionToFormat('webp')).toBe('webp')
    expect(extensionToFormat('bmp')).toBe('bmp')
    expect(extensionToFormat('ico')).toBe('ico')
    expect(extensionToFormat('avif')).toBe('avif')
    expect(extensionToFormat('svg')).toBe('svg')
  })

  it('大小写/前后空格/前导点容错', () => {
    expect(extensionToFormat(' PNG ')).toBe('png')
    expect(extensionToFormat('.JPG')).toBe('jpeg')
  })

  it('未知或空扩展名返回 null', () => {
    expect(extensionToFormat('txt')).toBeNull()
    expect(extensionToFormat('')).toBeNull()
  })
})

describe('getExtension', () => {
  it('取小写扩展名', () => {
    expect(getExtension('photo.PNG')).toBe('png')
    expect(getExtension('a.b.jpeg')).toBe('jpeg')
  })

  it('无扩展名返回空串', () => {
    expect(getExtension('README')).toBe('')
    expect(getExtension('')).toBe('')
  })
})

describe('formatLabel', () => {
  it('展示名大写，jpeg 特殊', () => {
    expect(formatLabel('png')).toBe('PNG')
    expect(formatLabel('jpeg')).toBe('JPEG')
    expect(formatLabel('webp')).toBe('WEBP')
    expect(formatLabel('svg')).toBe('SVG')
  })

  it('unknown 返回占位', () => {
    expect(formatLabel('unknown')).toBe('?')
  })
})

describe('conclusionText', () => {
  it('四种结论取对应文案', () => {
    expect(conclusionText('match', LABELS)).toBe('一致 ✓')
    expect(conclusionText('mismatch', LABELS)).toBe('扩展名与内容不符 ⚠')
    expect(conclusionText('unrecognized', LABELS)).toBe('无法识别 ✗')
    expect(conclusionText('noext', LABELS)).toBe('无扩展名，仅报告检测格式')
  })
})

describe('checkConsistency', () => {
  it('扩展名与检测一致', () => {
    const item = checkConsistency('photo.png', 'png', 'image/png')
    expect(item.consistency).toBe('match')
    expect(item.declaredExt).toBe('png')
    expect(item.expected).toBe('png')
    expect(item.detected).toBe('png')
    expect(item.declaredMime).toBe('image/png')
    expect(item.fileName).toBe('photo.png')
  })

  it('jpg 扩展名对应 jpeg 检测', () => {
    expect(checkConsistency('a.jpg', 'jpeg').consistency).toBe('match')
  })

  it('扩展名与检测不符', () => {
    const item = checkConsistency('fake.png', 'jpeg')
    expect(item.consistency).toBe('mismatch')
    expect(item.expected).toBe('png')
    expect(item.detected).toBe('jpeg')
  })

  it('检测为 unknown 时结论为无法识别', () => {
    expect(checkConsistency('a.png', 'unknown').consistency).toBe('unrecognized')
    expect(checkConsistency('README', 'unknown').consistency).toBe('unrecognized')
  })

  it('无扩展名时只报告检测格式', () => {
    const item = checkConsistency('README', 'png')
    expect(item.consistency).toBe('noext')
    expect(item.declaredExt).toBe('')
    expect(item.expected).toBeNull()
  })

  it('未知扩展名视为无期望格式', () => {
    expect(checkConsistency('a.txt', 'png').consistency).toBe('noext')
  })
})

describe('buildReportText', () => {
  it('空列表只输出标题与汇总', () => {
    const text = buildReportText([], LABELS)
    expect(text).toBe('图片格式检测报告\n共 0 个文件')
  })

  it('逐项输出文件名/声明类型/检测格式/结论', () => {
    const items = [
      checkConsistency('photo.png', 'png', 'image/png'),
      checkConsistency('fake.jpg', 'png', 'image/jpeg'),
      checkConsistency('blob', 'unknown'),
    ]
    const text = buildReportText(items, LABELS)
    expect(text).toContain('图片格式检测报告')
    expect(text).toContain('共 3 个文件')
    expect(text).toContain('[1] 文件：photo.png')
    expect(text).toContain('声明类型：png（image/png）')
    expect(text).toContain('检测格式：PNG')
    expect(text).toContain('结论：一致 ✓')
    expect(text).toContain('[2] 文件：fake.jpg')
    expect(text).toContain('结论：扩展名与内容不符 ⚠')
    expect(text).toContain('[3] 文件：blob')
    expect(text).toContain('声明类型：无扩展名')
    expect(text).toContain('检测格式：未知')
    expect(text).toContain('结论：无法识别 ✗')
  })

  it('无 MIME 时声明类型只写扩展名', () => {
    const text = buildReportText([checkConsistency('a.gif', 'gif')], LABELS)
    expect(text).toContain('声明类型：gif')
    expect(text).not.toContain('（')
  })
})

describe('assertFileSizeOk / assertFileCountOk', () => {
  it('未超限不抛错', () => {
    expect(() => assertFileSizeOk('a.png', MAX_FILE_SIZE)).not.toThrow()
    expect(() => assertFileCountOk(MAX_FILES)).not.toThrow()
  })

  it('超限抛错', () => {
    expect(() => assertFileSizeOk('big.png', MAX_FILE_SIZE + 1)).toThrow(/文件 big\.png 过大/)
    expect(() => assertFileCountOk(MAX_FILES + 1)).toThrow(/批量上限 50/)
  })
})
