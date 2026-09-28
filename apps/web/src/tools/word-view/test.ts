// @vitest-environment jsdom
/**
 * word-view 单元测试
 *
 * utils.ts 只放纯函数；mammoth 的动态加载与转换编排在 Tool.tsx，
 * 由 Tool.test.tsx（jsdom，真机转换）覆盖。
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  assertDocxFile,
  assertNonEmptyPreview,
  buildPreview,
  escapeHtml,
  exactBuffer,
  formatSize,
  previewToDocument,
  sanitizeHtml,
} from './utils'

describe('word-view / 基础工具', () => {
  it('formatSize 覆盖各档', () => {
    expect(formatSize(100)).toBe('100 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertDocxFile 放行 docx 并校验体积', () => {
    expect(() => assertDocxFile({ name: 'a.docx', size: 100 })).not.toThrow()
    expect(() => assertDocxFile({ name: 'A.DOCX', size: MAX_FILE_BYTES })).not.toThrow()
  })

  it('assertDocxFile 对旧版 .doc 给出专门提示', () => {
    expect(() => assertDocxFile({ name: 'a.doc', size: 100 })).toThrow(/暂不支持旧版 \.doc/)
  })

  it('assertDocxFile 拒绝其他扩展名 / 空文件 / 超大文件', () => {
    expect(() => assertDocxFile({ name: 'a.pdf', size: 100 })).toThrow(/请选择 \.docx 文件/)
    expect(() => assertDocxFile({ name: '', size: 100 })).toThrow(/未知/)
    expect(() => assertDocxFile({ name: 'a.docx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertDocxFile({ name: 'a.docx', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
  })

  it('exactBuffer 切出精确 ArrayBuffer', () => {
    const big = new Uint8Array([9, 1, 2, 9])
    const buf = exactBuffer(big.subarray(1, 3))
    expect(buf.byteLength).toBe(2)
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2])
  })
})

describe('word-view / sanitizeHtml', () => {
  it('空串返回空串', () => {
    expect(sanitizeHtml('')).toBe('')
    expect(sanitizeHtml('   ')).toBe('')
  })

  it('白名单标签与文本直通', () => {
    expect(sanitizeHtml('<h1>题</h1><p>正文<strong>粗</strong></p>')).toBe(
      '<h1>题</h1><p>正文<strong>粗</strong></p>',
    )
  })

  it('script / style / iframe 整体丢弃（含内容）', () => {
    expect(sanitizeHtml('<p>a</p><script>alert(1)</script><p>b</p>')).toBe('<p>a</p><p>b</p>')
    expect(sanitizeHtml('<style>p{color:red}</style><p>x</p>')).toBe('<p>x</p>')
    expect(sanitizeHtml('<iframe src="https://x.y"></iframe><p>x</p>')).toBe('<p>x</p>')
  })

  it('非白名单标签拆包保留子节点', () => {
    expect(sanitizeHtml('<font color="red">红</font>')).toBe('红')
    expect(sanitizeHtml('<custom-tag><p>内</p></custom-tag>')).toBe('<p>内</p>')
    expect(sanitizeHtml('<font>a<!--x-->b</font>')).toBe('ab')
  })

  it('注释节点被丢弃', () => {
    expect(sanitizeHtml('<p>a</p><!-- 注 --><p>b</p>')).toBe('<p>a</p><p>b</p>')
  })

  it('超链接：安全协议保留，其余去掉 href 但保留文本', () => {
    expect(sanitizeHtml('<a href="http://x.y">a</a>')).toBe('<a href="http://x.y">a</a>')
    expect(sanitizeHtml('<a href="https://x.y">b</a>')).toBe('<a href="https://x.y">b</a>')
    expect(sanitizeHtml('<a href="mailto:a@b.c">c</a>')).toBe('<a href="mailto:a@b.c">c</a>')
    expect(sanitizeHtml('<a href="#sec">d</a>')).toBe('<a href="#sec">d</a>')
    expect(sanitizeHtml('<a href="  HTTPS://x.y ">e</a>')).toBe('<a href="  HTTPS://x.y ">e</a>')
    expect(sanitizeHtml('<a href="javascript:alert(1)">f</a>')).toBe('<a>f</a>')
    expect(sanitizeHtml('<a>无址</a>')).toBe('<a>无址</a>')
  })

  it('图片：安全来源保留，alt 保留，危险 src 丢弃', () => {
    expect(sanitizeHtml('<img src="data:image/png;base64,AAA" alt="图">')).toBe(
      '<img src="data:image/png;base64,AAA" alt="图">',
    )
    expect(sanitizeHtml('<img src="http://x.y/a.png">')).toBe('<img src="http://x.y/a.png">')
    expect(sanitizeHtml('<img src="https://x.y/a.png">')).toBe('<img src="https://x.y/a.png">')
    expect(sanitizeHtml('<img src="javascript:alert(1)" alt="坏">')).toBe('<img alt="坏">')
    expect(sanitizeHtml('<img alt="无源">')).toBe('<img alt="无源">')
  })

  it('表格：数字 colspan / rowspan 保留，非数字丢弃', () => {
    expect(sanitizeHtml('<table><tr><td colspan="2">a</td></tr></table>')).toBe(
      '<table><tbody><tr><td colspan="2">a</td></tr></tbody></table>',
    )
    expect(sanitizeHtml('<table><tr><th rowspan="3">h</th></tr></table>')).toBe(
      '<table><tbody><tr><th rowspan="3">h</th></tr></tbody></table>',
    )
    expect(sanitizeHtml('<table><tr><td colspan="x">a</td></tr></table>')).toBe(
      '<table><tbody><tr><td>a</td></tr></tbody></table>',
    )
    expect(sanitizeHtml('<table><tr><td>a</td></tr></table>')).toBe(
      '<table><tbody><tr><td>a</td></tr></tbody></table>',
    )
  })

  it('嵌套结构递归清洗', () => {
    expect(sanitizeHtml('<div><p>a<script>x</script><font>b</font></p></div>')).toBe(
      '<div><p>ab</p></div>',
    )
  })
})

describe('word-view / 预览模型', () => {
  it('escapeHtml 转义四个字符', () => {
    expect(escapeHtml('a&b<c>d"e')).toBe('a&amp;b&lt;c&gt;d&quot;e')
  })

  it('buildPreview 清洗 HTML 并标记图片', () => {
    const withImg = buildPreview('a.docx', '<p>x</p><img src="data:image/png;base64,AAA">')
    expect(withImg.fileName).toBe('a.docx')
    expect(withImg.hasImages).toBe(true)
    expect(withImg.html).toContain('<img')
    const plain = buildPreview('b.docx', '<p>纯文本</p><script>x</script>')
    expect(plain.hasImages).toBe(false)
    expect(plain.html).toBe('<p>纯文本</p>')
  })

  it('assertNonEmptyPreview 空白即报错', () => {
    expect(() => assertNonEmptyPreview('  ')).toThrow(/没有可预览的内容/)
    expect(() => assertNonEmptyPreview('<p>x</p>')).not.toThrow()
  })

  it('previewToDocument 生成独立文档并转义文件名', () => {
    const doc = previewToDocument(buildPreview('报<告>.docx', '<h1>题</h1>'))
    expect(doc).toContain('<!DOCTYPE html>')
    expect(doc).toContain('<title>报&lt;告&gt;.docx</title>')
    expect(doc).toContain('<h1>题</h1>')
  })

  it('previewToDocument 空内容时给占位段落', () => {
    const doc = previewToDocument({ fileName: 'a.docx', html: '', hasImages: false })
    expect(doc).toContain('无可显示内容')
  })
})
