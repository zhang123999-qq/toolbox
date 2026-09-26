import { describe, expect, it } from 'vitest'
import { XmlFormatterError, locate, transform } from './utils'
import type { XmlFormatterInput, XmlFormatterOptions } from './schema'

const baseOptions: XmlFormatterOptions = { mode: 'format', indent: '2' }

describe('xml-formatter / transform', () => {
  it('按 2 空格缩进美化', () => {
    const input: XmlFormatterInput = { text: '<a><b>1</b><c/></a>' }
    expect(transform(input, baseOptions)).toBe('<a>\n  <b>1</b>\n  <c/>\n</a>')
  })

  it('tab 缩进档位生效', () => {
    const input: XmlFormatterInput = { text: '<a><b><c>1</c></b></a>' }
    expect(transform(input, { mode: 'format', indent: 'tab' })).toBe(
      '<a>\n\t<b>\n\t\t<c>1</c>\n\t</b>\n</a>',
    )
  })

  it('minify 只删缩进空白，不动文本内容', () => {
    const input: XmlFormatterInput = { text: '<a>\n  <b>  1  </b>\n  <c />\n</a>' }
    expect(transform(input, { mode: 'minify', indent: '2' })).toBe('<a><b>  1  </b><c/></a>')
  })

  it('保留注释、CDATA 与处理指令', () => {
    const input: XmlFormatterInput = {
      text: '<?xml version="1.0"?><a><!--说明--><b><![CDATA[<x>]]></b></a>',
    }
    expect(transform(input, { mode: 'minify', indent: '2' })).toBe(
      '<?xml version="1.0"?><a><!--说明--><b><![CDATA[<x>]]></b></a>',
    )
  })

  it('实体在解析后重新转义，往返一致', () => {
    const input: XmlFormatterInput = { text: '<a>1 &lt; 2 &amp; 3</a>' }
    expect(transform(input, { mode: 'minify', indent: '2' })).toBe('<a>1 &lt; 2 &amp; 3</a>')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  \n\t ' }, baseOptions)).toBe('')
  })

  it('标签不匹配抛出带行列号的 XmlFormatterError（异常）', () => {
    expect(() => transform({ text: '<a><b></a>' }, baseOptions)).toThrow(XmlFormatterError)
    expect(() => transform({ text: '<a><b></a>' }, baseOptions)).toThrow(/第 1 行第 7 列/)
  })

  it('缺少根元素时报错', () => {
    expect(() => transform({ text: '只有文本' }, baseOptions)).toThrow(XmlFormatterError)
  })

  it('未知实体引用报错', () => {
    expect(() => transform({ text: '<a>&nbsp;</a>' }, baseOptions)).toThrow(
      /实体引用 &nbsp; 无法识别/,
    )
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: '<a>' + 'x'.repeat(2_000_000) + '</a>' }, baseOptions)).toThrow(
      XmlFormatterError,
    )
  })

  it('locate 能换算出行列', () => {
    expect(locate('ab\ncd', 4)).toBe('第 2 行第 2 列')
    expect(locate('abc', 0)).toBe('第 1 行第 1 列')
  })
})
