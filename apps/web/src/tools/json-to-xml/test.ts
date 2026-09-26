import { describe, expect, it } from 'vitest'
import { JsonToXmlError, toXmlName, transform } from './utils'
import type { JsonToXmlOptions } from './schema'

const baseOptions: JsonToXmlOptions = { rootName: 'root', declaration: false, indent: '2' }

describe('json-to-xml / transform', () => {
  it('对象转嵌套 XML（不带声明）', () => {
    expect(transform({ text: '{"a":1,"b":"x"}' }, baseOptions)).toBe(
      '<root>\n  <a>1</a>\n  <b>x</b>\n</root>',
    )
  })

  it('包含 XML 声明', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, declaration: true })
    expect(out.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n')).toBe(true)
  })

  it('null 与空容器输出自闭合标签', () => {
    expect(transform({ text: '{"a":null,"b":{},"c":[]}' }, baseOptions)).toBe(
      '<root>\n  <a/>\n  <b/>\n  <c/>\n</root>',
    )
  })

  it('数组转重复同名元素', () => {
    expect(transform({ text: '{"tags":["a","b"]}' }, baseOptions)).toBe(
      '<root>\n  <tags>a</tags>\n  <tags>b</tags>\n</root>',
    )
  })

  it('对象数组在键下重复', () => {
    expect(transform({ text: '{"items":[{"x":1},{"x":2}]}' }, baseOptions)).toBe(
      '<root>\n  <items>\n    <x>1</x>\n  </items>\n  <items>\n    <x>2</x>\n  </items>\n</root>',
    )
  })

  it('顶层数组包成重复 item', () => {
    expect(transform({ text: '[{"a":1},{"a":2}]' }, baseOptions)).toBe(
      '<root>\n  <item>\n    <a>1</a>\n  </item>\n  <item>\n    <a>2</a>\n  </item>\n</root>',
    )
  })

  it('文本中的 & < > 被转义', () => {
    expect(transform({ text: '{"a":"x < y & z > 0"}' }, baseOptions)).toContain(
      '<a>x &lt; y &amp; z &gt; 0</a>',
    )
  })

  it('自定义根元素名', () => {
    expect(transform({ text: '{"a":1}' }, { ...baseOptions, rootName: 'data' })).toBe(
      '<data>\n  <a>1</a>\n</data>',
    )
  })

  it('非法键名归一为合法 XML Name', () => {
    // 连字符在名字中间合法；开头数字补下划线、! 替换为下划线
    expect(toXmlName('1bad-name!')).toBe('_1bad-name_')
    expect(toXmlName('-x')).toBe('_-x')
    expect(transform({ text: '{"a-b":1}' }, baseOptions)).toContain('<a-b>1</a-b>')
  })

  it('根标量直接成元素', () => {
    expect(transform({ text: '"hi"' }, baseOptions)).toBe('<root>hi</root>')
  })

  it('4 空格与 tab 缩进', () => {
    expect(transform({ text: '{"m":{"x":1}}' }, { ...baseOptions, indent: '4' })).toContain(
      '    <x>1</x>',
    )
    expect(transform({ text: '{"m":{"x":1}}' }, { ...baseOptions, indent: 'tab' })).toContain(
      '\t<m>',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
  })

  it('非法 JSON / 超长抛错（异常）', () => {
    expect(() => transform({ text: '{x' }, baseOptions)).toThrow(JsonToXmlError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToXmlError,
    )
  })
})
