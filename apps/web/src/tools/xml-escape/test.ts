import { describe, expect, it } from 'vitest'
import { escapeXml, transform, unescapeXml } from './utils'

const entity = { direction: 'escape', mode: 'entity' } as const
const numeric = { direction: 'escape', mode: 'numeric' } as const
const cdata = { direction: 'escape', mode: 'cdata' } as const
const un = { direction: 'unescape', mode: 'entity' } as const

describe('xml-escape / escape', () => {
  it('entity 模式转义五个预定义字符', () => {
    expect(escapeXml('<a href="x">A & B</a>', 'entity')).toBe(
      '&lt;a href=&quot;x&quot;&gt;A &amp; B&lt;/a&gt;',
    )
  })

  it('entity 模式下中文等非 ASCII 字符保持原样', () => {
    expect(escapeXml('工具库', 'entity')).toBe('工具库')
  })

  it('numeric 模式改用十进制数字实体', () => {
    expect(escapeXml('<&>"\'', 'numeric')).toBe('&#60;&#38;&#62;&#34;&#39;')
  })

  it('cdata 模式整段包进 CDATA', () => {
    expect(escapeXml('<a>', 'cdata')).toBe('<![CDATA[<a>]]>')
  })

  it('文本含 ]]> 时把 CDATA 断开再接续', () => {
    expect(escapeXml('a]]>b', 'cdata')).toBe('<![CDATA[a]]]]><![CDATA[>b]]>')
  })
})

describe('xml-escape / unescape', () => {
  it('还原五个命名实体', () => {
    expect(unescapeXml('&lt;a&gt;&amp;&quot;&apos;')).toBe('<a>&"\'')
  })

  it('还原十进制与十六进制数字实体', () => {
    expect(unescapeXml('&#60;&#38;&#x27;')).toBe("<&'")
  })

  it('还原 CDATA 段', () => {
    expect(unescapeXml('<![CDATA[<a>]]>')).toBe('<a>')
  })

  it('还原被拆开的 CDATA 段', () => {
    expect(unescapeXml('<![CDATA[a]]]]><![CDATA[>b]]>')).toBe('a]]>b')
  })

  it('规范外的实体（如 &nbsp;）原样保留', () => {
    expect(unescapeXml('&nbsp;')).toBe('&nbsp;')
  })
})

describe('xml-escape / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: '<b>' }, entity)).toBe('&lt;b&gt;')
    expect(transform({ text: '&lt;b&gt;' }, un)).toBe('<b>')
  })

  it('往返一致（entity）', () => {
    const text = '<a href="x">工具库 & \'ok\'</a>'
    expect(transform({ text: transform({ text }, entity) }, un)).toBe(text)
  })

  it('往返一致（numeric）', () => {
    const text = '<a href="x">工具库 & \'ok\'</a>'
    expect(transform({ text: transform({ text }, numeric) }, un)).toBe(text)
  })

  it('往返一致（cdata）', () => {
    const text = '<a href="x">工具库]]> & \'ok\'</a>'
    expect(transform({ text: transform({ text }, cdata) }, un)).toBe(text)
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, entity)).toBe('')
    expect(transform({ text: '' }, un)).toBe('')
  })

  it('码点超出 Unicode 范围时报错', () => {
    expect(() => transform({ text: '&#x110000;' }, un)).toThrow(/超出 Unicode 范围/)
  })
})
