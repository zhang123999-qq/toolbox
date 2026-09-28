/**
 * ppt-view 单元测试
 *
 * utils.ts 只放纯函数；fflate 是本工具的正式依赖（meta.deps），
 * 测试用它现场拼装 pptx 包。
 */
import { describe, expect, it } from 'vitest'
import { strToU8, zipSync } from 'fflate'
import {
  MAX_FILE_BYTES,
  assertPptxFile,
  extractSlideParagraphs,
  formatSize,
  parsePptxPreview,
  previewPptxFile,
  previewToText,
  slidePathsInOrder,
  unescapeXml,
} from './utils'

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
function buildPptx(parts: PptxParts = {}): Uint8Array<ArrayBuffer> {
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
  return zipSync(files) as Uint8Array<ArrayBuffer>
}

describe('ppt-view / 基础工具', () => {
  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertPptxFile 放行 pptx（含大写扩展名）', () => {
    expect(() => assertPptxFile({ name: 'a.pptx', size: 100 })).not.toThrow()
    expect(() => assertPptxFile({ name: 'A.PPTX', size: MAX_FILE_BYTES })).not.toThrow()
  })

  it('assertPptxFile 对旧版 .ppt 给出专门提示', () => {
    expect(() => assertPptxFile({ name: 'a.ppt', size: 100 })).toThrow(/暂不支持旧版 \.ppt/)
  })

  it('assertPptxFile 拒绝其他扩展名 / 空文件 / 超大文件', () => {
    expect(() => assertPptxFile({ name: 'a.pdf', size: 100 })).toThrow(/请选择 \.pptx 文件/)
    expect(() => assertPptxFile({ name: '', size: 100 })).toThrow(/未知/)
    expect(() => assertPptxFile({ name: 'a.pptx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertPptxFile({ name: 'a.pptx', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
  })

  it('unescapeXml 五种实体与顺序', () => {
    expect(unescapeXml('a&lt;b&gt;c&quot;d&apos;e&amp;f')).toBe('a<b>c"d\'e&f')
    // &amp; 最后替换：&amp;lt; 应得 &lt; 而不是 <
    expect(unescapeXml('&amp;lt;')).toBe('&lt;')
  })
})

describe('ppt-view / 文本提取', () => {
  it('多 run 段落拼接，空段落跳过', () => {
    const xml =
      `<p:sld xmlns:a="${A_NS}"><p:txBody><a:bodyPr/>` +
      '<a:p><a:r><a:t>甲</a:t></a:r><a:r><a:t>乙</a:t></a:r></a:p>' +
      '<a:p><a:r><a:t>   </a:t></a:r></a:p>' +
      '<a:p/>' +
      '<a:p lvl="1"><a:r><a:t>丙</a:t></a:r></a:p>' +
      '</p:txBody></p:txBody></p:sld>'
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
    // 注意：故意打乱播放顺序 + Target 属性前置 + ../ 前缀，验证鲁棒性
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

describe('ppt-view / 整包解析', () => {
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

  it('previewToText 生成纯文本汇总（含空白片标注）', () => {
    const text = previewToText(parsePptxPreview(buildPptx(), 'demo.pptx'))
    expect(text).toContain('演示文稿：demo.pptx（2 张幻灯片）')
    expect(text).toContain('--- 第 1 张 ---')
    expect(text).toContain('标题一')
    expect(text).toContain('要点 <1>')
    expect(text).toContain('--- 第 2 张 ---')
    expect(text).toContain('（空白幻灯片）')
  })
})

describe('ppt-view / 文件入口', () => {
  it('合法文件走完校验与解析', async () => {
    const file = new File([buildPptx()], 'demo.pptx', {
      type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    })
    const preview = await previewPptxFile(file)
    expect(preview.slides).toHaveLength(2)
  })

  it('非法扩展名在读字节前被拦下', async () => {
    const file = new File(['x'], 'a.txt', { type: 'text/plain' })
    await expect(previewPptxFile(file)).rejects.toThrow(/请选择 \.pptx 文件/)
  })
})
