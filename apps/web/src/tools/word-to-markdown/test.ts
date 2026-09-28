// @vitest-environment jsdom
/**
 * word-to-markdown 单元测试
 *
 * utils.ts 只放纯函数：htmlToMarkdown 直接喂手写 HTML 覆盖全部分支；
 * mammoth 的动态加载与转换编排在 Tool.tsx，由 Tool.test.tsx（jsdom，真机转换）覆盖。
 */
import { describe, expect, it } from 'vitest'
import {
  MAX_FILE_BYTES,
  assertDocxFile,
  assertNonEmptyMarkdown,
  exactBuffer,
  formatSize,
  htmlToMarkdown,
  stripImageTags,
} from './utils'

describe('word-to-markdown / 基础工具', () => {
  it('formatSize 覆盖各档', () => {
    expect(formatSize(999)).toBe('999 B')
    expect(formatSize(2048)).toBe('2.00 KiB')
    expect(formatSize(5 * 1024 * 1024)).toBe('5.00 MiB')
    expect(formatSize(2 * 1024 * 1024 * 1024)).toBe('2.00 GiB')
  })

  it('assertDocxFile 四条路径', () => {
    expect(() => assertDocxFile({ name: 'a.docx', size: 10 })).not.toThrow()
    expect(() => assertDocxFile({ name: 'a.xls', size: 10 })).toThrow(/请选择 \.docx/)
    expect(() => assertDocxFile({ name: '', size: 10 })).toThrow(/未知/)
    expect(() => assertDocxFile({ name: 'a.docx', size: 0 })).toThrow(/文件为空/)
    expect(() => assertDocxFile({ name: 'a.docx', size: MAX_FILE_BYTES + 1 })).toThrow(/文件过大/)
  })

  it('stripImageTags', () => {
    expect(stripImageTags('<p>x</p><img src="a"/>')).toBe('<p>x</p>')
  })

  it('exactBuffer 切出与视图等长的精确 ArrayBuffer', () => {
    const big = new Uint8Array([9, 1, 2, 3, 9])
    const view = big.subarray(1, 4)
    const buf = exactBuffer(view)
    expect(buf.byteLength).toBe(3)
    expect(Array.from(new Uint8Array(buf))).toEqual([1, 2, 3])
  })

  it('assertNonEmptyMarkdown 空串即报错', () => {
    expect(() => assertNonEmptyMarkdown('')).toThrow(/没有可转换的内容/)
    expect(() => assertNonEmptyMarkdown('# t\n')).not.toThrow()
  })
})

describe('word-to-markdown / htmlToMarkdown 行内', () => {
  it('空串返回空串，顶层裸文本被收纳', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(htmlToMarkdown('顶层文本')).toBe('顶层文本\n')
  })

  it('标题层级与段落', () => {
    expect(htmlToMarkdown('<h1>T</h1><h3>S</h3><p>正文</p>')).toBe('# T\n\n### S\n\n正文\n')
  })

  it('行内格式：加粗 / 斜体 / 代码 / 删除线 / 链接 / 换行', () => {
    const md = htmlToMarkdown(
      '<p><strong>b</strong> <em>i</em> <code>c</code> <s>s</s> ' +
        '<a href="https://x.y">链</a> <a>无址</a><br>下行</p>',
    )
    expect(md).toBe('**b** *i* `c` ~~s~~ [链](https://x.y) 无址\n下行\n')
  })

  it('图片与未知行内标签被消化', () => {
    expect(htmlToMarkdown('<p>a<img src="x"><span> b</span></p>')).toBe('a b\n')
  })

  it('注释节点不产生输出', () => {
    expect(htmlToMarkdown('<p>a</p><!-- 注 --><p>b</p>')).toBe('a\n\nb\n')
  })

  it('空白被压缩', () => {
    expect(htmlToMarkdown('<p>a   b\n\tc</p>')).toBe('a b c\n')
  })
})

describe('word-to-markdown / htmlToMarkdown 块级', () => {
  it('无序与有序列表', () => {
    expect(htmlToMarkdown('<ul><li>a</li><li>b</li></ul>')).toBe('- a\n- b\n')
    expect(htmlToMarkdown('<ol><li>a</li><li>b</li></ol>')).toBe('1. a\n2. b\n')
  })

  it('嵌套列表缩进两格', () => {
    const md = htmlToMarkdown('<ul><li>父<ul><li>子</li></ul></li><li>单</li></ul>')
    expect(md).toBe('- 父\n  - 子\n- 单\n')
  })

  it('只有子列表的 li 与空 li', () => {
    expect(htmlToMarkdown('<ul><li><ul><li>x</li></ul></li></ul>')).toBe('-\n  - x\n')
    expect(htmlToMarkdown('<ul><li></li></ul>')).toBe('-\n')
  })

  it('表格：表头分隔线、管道转义、不等列补齐', () => {
    const md = htmlToMarkdown(
      '<table><thead><tr><th>名</th><th>值</th></tr></thead>' +
        '<tbody><tr><td>a|b</td></tr><tr><td>x</td><td>y</td></tr></tbody></table>',
    )
    expect(md).toBe('| 名 | 值 |\n| --- | --- |\n| a\\|b |  |\n| x | y |\n')
  })

  it('裸 tr 表格与空表格', () => {
    expect(htmlToMarkdown('<table><tr><td>a</td></tr></table>')).toBe('| a |\n| --- |\n')
    expect(htmlToMarkdown('<table></table>')).toBe('')
  })

  it('表格容忍注释与 caption 等杂散节点', () => {
    const md = htmlToMarkdown(
      '<table><!-- 注 --><caption>题</caption>' +
        '<thead><!-- 注 --><tr><th>h</th></tr></thead>' +
        '<tfoot><tr><td>f</td></tr></tfoot>' +
        '<tbody><tr><td>a</td><!-- 注 --></tr></tbody></table>',
    )
    expect(md).toBe('| h |\n| --- |\n| f |\n| a |\n')
  })

  it('列表容忍杂散文本子节点，行内容忍行内注释', () => {
    expect(htmlToMarkdown('<ul> stray <li>a</li></ul>')).toBe('- a\n')
    expect(htmlToMarkdown('<p>a<!--x-->b</p>')).toBe('ab\n')
  })

  it('引用块、分隔线、预排版、div', () => {
    expect(htmlToMarkdown('<blockquote><p>引</p><p>用</p></blockquote>')).toBe('> 引\n>\n> 用\n')
    expect(htmlToMarkdown('<p>a</p><hr><p>b</p>')).toBe('a\n\n---\n\nb\n')
    expect(htmlToMarkdown('<pre>if x:\n    y()</pre>')).toBe('```\nif x:\n    y()\n```\n')
    expect(htmlToMarkdown('<div><p>a</p></div><section><p>b</p></section>')).toBe('a\n\nb\n')
  })
})
