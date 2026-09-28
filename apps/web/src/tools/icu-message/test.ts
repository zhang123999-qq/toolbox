/**
 * icu-message（#728）utils 单测：ICU 解析 / 预览 / 占位提取。
 */
import { describe, expect, it } from 'vitest'
import { extractPlaceholders, parseIcu, previewIcu, type IcuNode } from './utils'

describe('parseIcu 基础', () => {
  it('空串得空数组', () => {
    expect(parseIcu('')).toEqual([])
  })
  it('纯文本', () => {
    expect(parseIcu('你好世界')).toEqual([{ kind: 'text', value: '你好世界' }])
  })
  it('简单参数', () => {
    expect(parseIcu('Hi {name}!')).toEqual([
      { kind: 'text', value: 'Hi ' },
      { kind: 'argument', name: 'name' },
      { kind: 'text', value: '!' },
    ])
  })
  it('中文参数名', () => {
    expect(parseIcu('{名字}')).toEqual([{ kind: 'argument', name: '名字' }])
  })
  it('引号转义', () => {
    expect(parseIcu("it''s")).toEqual([{ kind: 'text', value: "it's" }])
    expect(parseIcu("'{x'}")).toEqual([{ kind: 'text', value: '{x}' }])
  })
  it('引号转义（续）', () => {
    expect(parseIcu("'#'")).toEqual([{ kind: 'text', value: '#' }])
    expect(parseIcu("a'b")).toEqual([{ kind: 'text', value: "a'b" }])
    expect(parseIcu("'{a")).toEqual([{ kind: 'text', value: '{a' }])
  })
  it('number/date/time 无样式', () => {
    expect(parseIcu('{n, number}')).toEqual([{ kind: 'number', name: 'n', style: '' }])
    expect(parseIcu('{d, date}')).toEqual([{ kind: 'date', name: 'd', style: '' }])
    expect(parseIcu('{t, time}')).toEqual([{ kind: 'time', name: 't', style: '' }])
  })
  it('number 带样式', () => {
    expect(parseIcu('{n, number, ::currency/USD}')).toEqual([
      { kind: 'number', name: 'n', style: '::currency/USD' },
    ])
  })
  it('plural 解析', () => {
    const nodes = parseIcu('{n, plural, =0{无} other{# 个}}')
    expect(nodes).toHaveLength(1)
    const p = nodes[0]
    expect(p.kind).toBe('plural')
    if (p.kind === 'plural') {
      expect(p.offset).toBe(0)
      expect(p.cases.map((c) => c.selector)).toEqual(['=0', 'other'])
    }
  })
  it('plural offset 解析', () => {
    const [p] = parseIcu('{n, plural, offset:1 =0{无} other{# 个}}')
    expect(p.kind).toBe('plural')
    if (p.kind === 'plural') expect(p.offset).toBe(1)
  })
  it('selectordinal 解析', () => {
    const [p] = parseIcu('{n, selectordinal, one{#st} other{#th}}')
    expect(p.kind).toBe('selectordinal')
  })
  it('select 解析', () => {
    const [s] = parseIcu('{g, select, male{他} female{她} other{TA}}')
    expect(s.kind).toBe('select')
    if (s.kind === 'select') expect(s.cases).toHaveLength(3)
  })
  it('嵌套解析', () => {
    const nodes = parseIcu('{n, plural, other{{g, select, male{他} other{TA}}有 # 条}}')
    expect(nodes[0].kind).toBe('plural')
  })
})

describe('parseIcu 语法错误（带位置）', () => {
  it('多余的右花括号', () => {
    expect(() => parseIcu('ab}')).toThrow('多余的右花括号')
  })
  it('缺少参数名', () => {
    expect(() => parseIcu('{}')).toThrow('缺少参数名')
    expect(() => parseIcu('{ }')).toThrow('缺少参数名')
  })
  it('缺少逗号', () => {
    expect(() => parseIcu('{name')).toThrow('缺少「,」')
    expect(() => parseIcu('a {b} c {d')).toThrow('缺少「,」')
  })
  it('类型后缺少参数名', () => {
    expect(() => parseIcu('{name,}')).toThrow('缺少参数名')
  })
  it('无样式复杂类型抛错', () => {
    expect(() => parseIcu('{n, plural}')).toThrow('缺少样式体')
    expect(() => parseIcu('{x, foo}')).toThrow('缺少样式体')
  })
  it('不支持的类型', () => {
    expect(() => parseIcu('{x, foo, bar}')).toThrow('不支持的参数类型「foo」')
  })
  it('样式未闭合', () => {
    expect(() => parseIcu('{n, number, ::x')).toThrow('花括号未闭合')
  })
  it('顶层花括号未闭合', () => {
    expect(() => parseIcu('{n')).toThrow('缺少「,」')
    expect(() => parseIcu('a {b} c {d')).toThrow('缺少「,」')
  })
  it('分支缺少选择器', () => {
    expect(() => parseIcu('{n, plural, {xx}}')).toThrow('分支缺少选择器')
  })
  it('分支未闭合', () => {
    expect(() => parseIcu('{n, plural, other{xx}')).toThrow('分支花括号未闭合')
    expect(() => parseIcu('{n, plural, other{xx')).toThrow('花括号未闭合')
  })
  it('空分支抛错', () => {
    expect(() => parseIcu('{n, plural, }')).toThrow('至少需要一个分支')
  })
  it('错误带字符位置', () => {
    expect(() => parseIcu('ab}')).toThrow('第 3 个字符处')
  })
})

describe('previewIcu', () => {
  it('简单替换与缺失占位', () => {
    expect(previewIcu('Hi {name}!', { name: 'Tom' })).toBe('Hi Tom!')
    expect(previewIcu('Hi {name}!', {})).toBe('Hi {name}!')
  })
  it('number 格式化', () => {
    expect(previewIcu('{n, number}', { n: 1234567 })).toBe('1,234,567')
    expect(previewIcu('{n, number}', { n: 'abc' })).toBe('abc')
    expect(previewIcu('{n, number}', {})).toBe('{n}')
  })
  it('date/time 原样输出', () => {
    expect(previewIcu('{d, date}', { d: '2024-01-01' })).toBe('2024-01-01')
    expect(previewIcu('{t, time}', {})).toBe('{t}')
  })
  it('plural 精确分支优先', () => {
    const m = '{n, plural, =0{没有} =1{一条} other{# 条}}'
    expect(previewIcu(m, { n: 0 })).toBe('没有')
    expect(previewIcu(m, { n: 1 })).toBe('一条')
    expect(previewIcu(m, { n: 5 })).toBe('5 条')
  })
  it('plural 缺失变量与无 other', () => {
    expect(previewIcu('{n, plural, other{#}}', {})).toBe('{n}')
    expect(previewIcu('{n, plural, =1{一}}', { n: 2 })).toBe('')
  })
  it('plural offset 影响 #', () => {
    expect(previewIcu('{n, plural, offset:1 =0{无} other{# 人}}', { n: 3 })).toBe('2 人')
  })
  it('plural 外的 # 保持原样', () => {
    expect(previewIcu('# {n, plural, other{#}}', { n: 5 })).toBe('# 5')
  })
  it('select 匹配与回退', () => {
    const m = '{g, select, male{他} female{她} other{TA}}来了'
    expect(previewIcu(m, { g: 'male' })).toBe('他来了')
    expect(previewIcu(m, { g: 'unknown' })).toBe('TA来了')
    expect(previewIcu(m, {})).toBe('{g}来了')
    expect(previewIcu('{g, select, male{他}}', { g: 'x' })).toBe('')
  })
  it('嵌套渲染', () => {
    const m = '{n, plural, other{{g, select, male{他} other{TA}}有 # 条}}'
    expect(previewIcu(m, { n: 3, g: 'female' })).toBe('TA有 3 条')
  })
})

describe('extractPlaceholders', () => {
  it('去重保序含嵌套', () => {
    expect(extractPlaceholders('{b} {n, plural, other{# {b} {x}}} {b}')).toEqual(['b', 'n', 'x'])
  })
  it('纯文本无占位', () => {
    expect(extractPlaceholders('hello')).toEqual([])
  })
  it('number 参数被提取', () => {
    expect(extractPlaceholders('{n, number}')).toEqual(['n'])
  })
})

describe('AST 形状', () => {
  it('IcuNode 可判别', () => {
    const nodes: IcuNode[] = parseIcu('{a} {n, number} {d, date} {t, time}')
    expect(nodes.map((n) => n.kind)).toEqual([
      'argument',
      'text',
      'number',
      'text',
      'date',
      'text',
      'time',
    ])
  })
})
