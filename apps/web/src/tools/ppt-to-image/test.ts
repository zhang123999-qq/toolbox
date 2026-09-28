/**
 * ppt-to-image 单元测试
 *
 * utils.ts 只放纯函数；fflate 是本工具的正式依赖（meta.deps），
 * 测试用它现场拼装 pptx 包。canvas 绘制在 Tool.tsx，不在此覆盖。
 */
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import {
  MAX_FILE_BYTES,
  assertPptxFile,
  extractSlideParagraphs,
  formatSize,
  layoutSlideImage,
  parseImageSize,
  parsePptxPreview,
  slidePathsInOrder,
  unescapeXml,
  wrapText,
} from './utils'
import type { SlideText } from './utils'

const RELS_NS = 'http://schemas.openxmlformats.org/package/2006/relationships'
const P_NS = 'http://schemas.openxmlformats.org/presentationml/2006/main'
const A_NS = 'http://schemas.openxmlformats.org/drawingml/2006/main'
const OFFICE_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'

function slideXml(paragraphs: string[]): string {
  const body = paragraphs.map((p) => `<a:p><a:r><a:t>${p}</a:t></a:r></a:p>`).join('')
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<p:sld xmlns:a="${A_NS}" xmlns:p="${P_NS}"><p:cSld><p:spTree>` +
    `<p:sp><p:txBody><a:bodyPr/>${body}</p:txBody></p:sp>` +
    `</p:spTree></p:cSld></p:sld>`
  )
}

interface PptxParts {
  readonly slideIds?: readonly string[]
  readonly rels?: Readonly<Record<string, string>>
  readonly slides?: Readonly<Record<string, string>>
  readonly omit?: readonly string[]
}

/** 现场拼装最小 pptx */
function buildPptx(parts: PptxParts = {}): Uint8Array {
  const slideIds = parts.slideIds ?? ['rId2', 'rId3']
  const rels = parts.rels ?? { rId2: 'slides/slide1.xml', rId3: 'slides/slide2.xml' }
  const slides = parts.slides ?? {
    'slides/slide1.xml': slideXml(['标题一', '要点 &lt;1&gt;']),
    'slides/slide2.xml': slideXml([]),
  }
  const files: Record<string, Uint8Array> = {
    '[Content_Types].xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
        `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
        `<Default Extension="xml" ContentType="application/xml"/></Types>`,
    ),
    '_rels/.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${RELS_NS}">` +
        `<Relationship Id="rId1" Type="${OFFICE_REL}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`,
    ),
    'ppt/presentation.xml': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><p:presentation xmlns:p="${P_NS}" xmlns:r="${OFFICE_REL}">` +
        `<p:sldIdLst>${slideIds.map((id) => `<p:sldId r:id="${id}"/>`).join('')}</p:sldIdLst></p:presentation>`,
    ),
    'ppt/_rels/presentation.xml.rels': strToU8(
      `<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="${RELS_NS}">` +
        Object.entries(rels)
          .map(
            ([id, target]) =>
              `<Relationship Id="${id}" Type="${OFFICE_REL}/slide" Target="${target}"/>`,
          )
          .join('') +
        `</Relationships>`,
    ),
  }
  for (const [name, xml] of Object.entries(slides)) {
    files[`ppt/${name}`] = strToU8(xml)
  }
  for (const name of parts.omit ?? []) delete files[name]
  return zipSync(files)
}

/** 假 measure：每字符宽度 = 字号 × 0.5 */
const fakeMeasure = (text: string, fontSize: number): number => text.length * fontSize * 0.5

const slide = (title: string, paragraphs: string[]): SlideText => ({ index: 1, title, paragraphs })

describe('ppt-to-image / 基础工具', () => {
  it('parseImageSize 解析三种尺寸', () => {
    expect(parseImageSize('960x540')).toEqual({ width: 960, height: 540 })
    expect(parseImageSize('1280x720')).toEqual({ width: 1280, height: 720 })
    expect(parseImageSize('800x600')).toEqual({ width: 800, height: 600 })
  })

  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertPptxFile 放行 / 拦截各情形', () => {
    expect(() => assertPptxFile({ name: 'a.pptx', size: 100 })).not.toThrow()
    expect(() => assertPptxFile({ name: 'A.PPTX', size: MAX_FILE_BYTES })).not.toThrow()
    expect(() => assertPptxFile({ name: 'a.ppt', size: 100 })).toThrow(/暂不支持旧版 \.ppt/)
    expect(() => assertPptxFile({ name: 'a.pdf', size: 100 })).toThrow(/请选择 \.pptx 文件/)
    expect(() => assertPptxFile({ name: '', size: 100 })).toThrow(/未知/)
    expect(() => assertPptxFile({ name: 'a.pptx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertPptxFile({ name: 'a.pptx', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
  })

  it('unescapeXml 五种实体与顺序', () => {
    expect(unescapeXml('a&lt;b&gt;c&quot;d&apos;e&amp;f')).toBe('a<b>c"d\'e&f')
    expect(unescapeXml('&amp;lt;')).toBe('&lt;')
  })
})

describe('ppt-to-image / 文本提取', () => {
  it('多 run 段落拼接，空段落跳过', () => {
    const xml =
      `<p:sld xmlns:a="${A_NS}"><p:txBody><a:bodyPr/>` +
      '<a:p><a:r><a:t>甲</a:t></a:r><a:r><a:t>乙</a:t></a:r></a:p>' +
      '<a:p><a:r><a:t>   </a:t></a:r></a:p>' +
      '<a:p/>' +
      '<a:p lvl="1"><a:r><a:t>丙</a:t></a:r></a:p>' +
      '</p:txBody></p:sld>'
    expect(extractSlideParagraphs(xml)).toEqual(['甲乙', '丙'])
  })

  it('无段落返回空数组', () => {
    expect(extractSlideParagraphs('<p:sld/>')).toEqual([])
  })

  it('slidePathsInOrder 按播放顺序返回包内路径', () => {
    const pres =
      `<p:presentation xmlns:p="${P_NS}" xmlns:r="${OFFICE_REL}"><p:sldIdLst>` +
      '<p:sldId r:id="rId3"/><p:sldId r:id="rId2"/></p:sldIdLst></p:presentation>'
    const rels =
      `<Relationships xmlns="${RELS_NS}">` +
      `<Relationship Id="rId2" Type="${OFFICE_REL}/slide" Target="slides/slide1.xml"/>` +
      `<Relationship Target="../slides/slide2.xml" Id="rId3" Type="${OFFICE_REL}/slide"/>` +
      `</Relationships>`
    expect(slidePathsInOrder(pres, rels)).toEqual([
      'ppt/slides/slide2.xml',
      'ppt/slides/slide1.xml',
    ])
  })

  it('slidePathsInOrder 跳过 rels 缺失的引用', () => {
    const pres =
      `<p:presentation xmlns:p="${P_NS}" xmlns:r="${OFFICE_REL}"><p:sldIdLst>` +
      '<p:sldId r:id="rId9"/><p:sldId r:id="rId2"/></p:sldIdLst></p:presentation>'
    const rels =
      `<Relationships xmlns="${RELS_NS}">` +
      `<Relationship Id="rId2" Type="${OFFICE_REL}/slide" Target="ppt/slides/slide1.xml"/>` +
      `</Relationships>`
    expect(slidePathsInOrder(pres, rels)).toEqual(['ppt/slides/slide1.xml'])
  })
})

describe('ppt-to-image / 整包解析', () => {
  it('双幻灯片：标题、段落、反转义、空片', () => {
    const preview = parsePptxPreview(buildPptx(), 'demo.pptx')
    expect(preview.fileName).toBe('demo.pptx')
    expect(preview.slides).toHaveLength(2)
    expect(preview.slides[0]).toEqual({
      index: 1,
      title: '标题一',
      paragraphs: ['标题一', '要点 <1>'],
    })
    expect(preview.slides[1]).toEqual({ index: 2, title: '', paragraphs: [] })
  })

  it('空字节 / 非 zip / 缺部件 / 无幻灯片', () => {
    expect(() => parsePptxPreview(new Uint8Array(0), 'x.pptx')).toThrow(/文件为空/)
    expect(() => parsePptxPreview(new Uint8Array([1, 2, 3]), 'x.pptx')).toThrow(/文件解析失败/)
    expect(() => parsePptxPreview(buildPptx({ omit: ['ppt/presentation.xml'] }), 'x.pptx')).toThrow(
      /缺少 ppt\/presentation\.xml/,
    )
    expect(() =>
      parsePptxPreview(buildPptx({ omit: ['ppt/_rels/presentation.xml.rels'] }), 'x.pptx'),
    ).toThrow(/缺少 ppt\/_rels\/presentation\.xml\.rels/)
    expect(() =>
      parsePptxPreview(buildPptx({ omit: ['ppt/slides/slide2.xml'] }), 'x.pptx'),
    ).toThrow(/缺少 ppt\/slides\/slide2\.xml/)
    expect(() => parsePptxPreview(buildPptx({ slideIds: [] }), 'x.pptx')).toThrow(/没有幻灯片/)
  })
})

describe('ppt-to-image / 换行', () => {
  it('按宽度贪心换行', () => {
    const measure = (s: string): number => s.length * 10
    expect(wrapText('abcdef', 25, measure)).toEqual(['ab', 'cd', 'ef'])
  })

  it('恰好贴合宽度不换行', () => {
    const measure = (s: string): number => s.length * 10
    expect(wrapText('ab', 20, measure)).toEqual(['ab'])
  })

  it('首字符即超宽时不丢字符', () => {
    const measure = (): number => 100
    expect(wrapText('ab', 25, measure)).toEqual(['a', 'b'])
  })

  it('空文本返回单空行', () => {
    expect(wrapText('', 100, (s) => s.length)).toEqual([''])
  })
})

describe('ppt-to-image / 版式', () => {
  it('标题 + 正文：坐标与样式精确', () => {
    const layout = layoutSlideImage(
      slide('标题一', ['标题一', '要点 <1>']),
      { width: 960, height: 540, background: 'white' },
      fakeMeasure,
    )
    expect(layout.background).toBe('#ffffff')
    expect(layout.empty).toBe(false)
    expect(layout.lines).toHaveLength(2)
    expect(layout.lines[0]).toEqual({
      text: '标题一',
      x: 58,
      y: 99,
      fontSize: 41,
      bold: true,
      color: '#0f172a',
    })
    expect(layout.lines[1]).toEqual({
      text: '要点 <1>',
      x: 58,
      y: 181,
      fontSize: 24,
      bold: false,
      color: '#334155',
    })
  })

  it('深色背景配色', () => {
    const layout = layoutSlideImage(
      slide('T', ['T', '正文']),
      { width: 960, height: 540, background: 'dark' },
      fakeMeasure,
    )
    expect(layout.background).toBe('#1e293b')
    expect(layout.lines[0]?.color).toBe('#f8fafc')
    expect(layout.lines[1]?.color).toBe('#cbd5e1')
    expect(layout.placeholderColor).toBe('#64748b')
  })

  it('空白幻灯片：empty 标记', () => {
    const layout = layoutSlideImage(
      slide('', []),
      { width: 960, height: 540, background: 'white' },
      fakeMeasure,
    )
    expect(layout.empty).toBe(true)
    expect(layout.lines).toEqual([])
    expect(layout.placeholderColor).toBe('#94a3b8')
  })

  it('无标题但有正文：跳过标题区', () => {
    const layout = layoutSlideImage(
      slide('', ['正文']),
      { width: 960, height: 540, background: 'white' },
      fakeMeasure,
    )
    expect(layout.empty).toBe(false)
    expect(layout.lines).toHaveLength(1)
    expect(layout.lines[0]).toEqual({
      text: '正文',
      x: 58,
      y: 82,
      fontSize: 24,
      bold: false,
      color: '#334155',
    })
  })

  it('长标题换行多行', () => {
    const layout = layoutSlideImage(
      slide('标题标题标题标题标题标题标题', ['标题标题标题标题标题标题标题', '短']),
      { width: 200, height: 540, background: 'white' },
      fakeMeasure,
    )
    // 标题 14 字：每行约 8 字 → 2 行
    const titleLines = layout.lines.filter((l) => l.bold)
    expect(titleLines).toHaveLength(2)
    expect(titleLines[0]?.y).toBe(53)
    expect(titleLines[1]?.y).toBeCloseTo(53 + 41 * 1.4, 5)
    expect(layout.lines.some((l) => l.text === '短' && !l.bold)).toBe(true)
  })

  it('画布过矮：超出部分截断', () => {
    const layout = layoutSlideImage(
      slide('标题', ['标题', '正文']),
      { width: 960, height: 100, background: 'white' },
      fakeMeasure,
    )
    expect(layout.empty).toBe(false)
    expect(layout.lines).toEqual([])
  })
})
