import { describe, expect, it } from 'vitest'
import { YamlToXmlError, transform } from './utils'
import type { YamlToXmlInput, YamlToXmlOptions } from './schema'

const baseOptions: YamlToXmlOptions = { indent: '2' }

describe('yaml-to-xml / transform', () => {
  it('映射转为带层级的 XML 元素', () => {
    const input: YamlToXmlInput = { text: 'app:\n  name: 工具库\n  port: 8080' }
    expect(transform(input, baseOptions)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<root>',
        '  <app>',
        '    <name>工具库</name>',
        '    <port>8080</port>',
        '  </app>',
        '</root>',
      ].join('\n'),
    )
  })

  it('序列按同名元素重复输出', () => {
    const input: YamlToXmlInput = { text: 'tags:\n  - yaml\n  - xml' }
    expect(transform(input, baseOptions)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<root>',
        '  <tags>yaml</tags>',
        '  <tags>xml</tags>',
        '</root>',
      ].join('\n'),
    )
  })

  it('顶层序列用 root/item 包裹', () => {
    const input: YamlToXmlInput = { text: '- a\n- b' }
    expect(transform(input, baseOptions)).toBe(
      [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<root>',
        '  <item>a</item>',
        '  <item>b</item>',
        '</root>',
      ].join('\n'),
    )
  })

  it('转义 XML 特殊字符与非法标签名', () => {
    const input: YamlToXmlInput = { text: 'expr: a < b & c\n"my key": 1' }
    const out = transform(input, baseOptions)
    expect(out).toContain('<expr>a &lt; b &amp; c</expr>')
    expect(out).toContain('<my_key>1</my_key>')
  })

  it('null 输出空元素，indent=4 时缩进为四空格', () => {
    const input: YamlToXmlInput = { text: 'a: ~' }
    expect(transform(input, { indent: '4' })).toBe(
      ['<?xml version="1.0" encoding="UTF-8"?>', '<root>', '    <a />', '</root>'].join('\n'),
    )
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  \n ' }, baseOptions)).toBe('')
  })

  it('语法错误抛出带行列位置的 YamlToXmlError（异常）', () => {
    expect(() => transform({ text: 'a:\n\tb: 1' }, baseOptions)).toThrow(YamlToXmlError)
    expect(() => transform({ text: 'a:\n\tb: 1' }, baseOptions)).toThrow(/第 2 行/)
  })

  it('超长输入抛错（边界）', () => {
    expect(() => transform({ text: 'a: ' + 'x'.repeat(1_000_001) }, baseOptions)).toThrow(
      YamlToXmlError,
    )
  })
})
