import { describe, expect, it } from 'vitest'
import { XmlToJsonError, decodeEntities, normalizeList, transform } from './utils'
import type { XmlToJsonInput, XmlToJsonOptions } from './schema'

const baseOptions: XmlToJsonOptions = {
  prefix: '@',
  mode: 'auto',
  textKey: '#text',
  indent: '2',
}

function compact(text: string, options: XmlToJsonOptions = baseOptions): string {
  return transform({ text }, { ...options, indent: '0' })
}

describe('xml-to-json / transform', () => {
  it('纯文本元素退化成字符串', () => {
    expect(compact('<a>hello</a>')).toBe('{"a":"hello"}')
  })

  it('属性加前缀，文本落到 textKey', () => {
    expect(compact('<a x="1">hello</a>')).toBe('{"a":{"@x":"1","#text":"hello"}}')
  })

  it('textKey 可切换', () => {
    expect(compact('<a x="1">hello</a>', { ...baseOptions, textKey: 'value' })).toBe(
      '{"a":{"@x":"1","value":"hello"}}',
    )
  })

  it('同名子元素在 auto 模式下才归一成数组', () => {
    const single: XmlToJsonInput = { text: '<r><i>1</i></r>' }
    const multi: XmlToJsonInput = { text: '<r><i>1</i><i>2</i></r>' }
    expect(compact(single.text)).toBe('{"r":{"i":"1"}}')
    expect(compact(multi.text)).toBe('{"r":{"i":["1","2"]}}')
  })

  it('always 一律数组，never 只保留最后一个', () => {
    const text = '<r><i>1</i><i>2</i></r>'
    expect(compact(text, { ...baseOptions, mode: 'always' })).toBe('{"r":{"i":["1","2"]}}')
    expect(compact(text, { ...baseOptions, mode: 'never' })).toBe('{"r":{"i":"2"}}')
  })

  it('嵌套结构与 CDATA 都能转换', () => {
    const text = '<r><a><b><![CDATA[<x>]]></b></a></r>'
    expect(compact(text)).toBe('{"r":{"a":{"b":"<x>"}}}')
  })

  it('实体解码后再进入 JSON', () => {
    expect(compact('<a>1 &lt; 2 &amp; 3</a>')).toBe('{"a":"1 < 2 & 3"}')
  })

  it('缩进档位生效', () => {
    const text = '<a><b>1</b></a>'
    expect(transform({ text }, { ...baseOptions, indent: '2' })).toBe(
      '{\n  "a": {\n    "b": "1"\n  }\n}',
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: ' \n ' }, baseOptions)).toBe('')
  })

  it('标签不匹配抛出带位置的 XmlToJsonError（异常）', () => {
    expect(() => transform({ text: '<a><b></a>' }, baseOptions)).toThrow(XmlToJsonError)
    expect(() => transform({ text: '<a><b></a>' }, baseOptions)).toThrow(/第 1 行第 7 列/)
  })

  it('缺少根元素或属性无引号都报错', () => {
    expect(() => transform({ text: '只有文本' }, baseOptions)).toThrow(XmlToJsonError)
    expect(() => transform({ text: '<a x=1 />' }, baseOptions)).toThrow(XmlToJsonError)
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: '<a>' + 'x'.repeat(2_000_000) + '</a>' }, baseOptions)).toThrow(
      XmlToJsonError,
    )
  })

  it('工具函数可单独使用', () => {
    expect(decodeEntities('&lt;a&amp;b&gt;')).toBe('<a&b>')
    expect(normalizeList([1], 'auto')).toBe(1)
    expect(normalizeList([1, 2], 'auto')).toEqual([1, 2])
  })
})
