import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('regex-ast / transform', () => {
  it('字面量串出 Concatenation + Literal', () => {
    const out = transform({ text: 'abc' }, {})
    expect(out).toContain('Regex')
    expect(out).toContain('Concatenation')
    expect(out).toContain('Literal "a"')
    expect(out).toContain('Literal "b"')
    expect(out).toContain('Literal "c"')
  })

  it('量词出 Quantifier 节点', () => {
    const out = transform({ text: 'a+' }, {})
    expect(out).toContain('Quantifier {1,∞}')
    expect(out).toContain('Literal "a"')
  })

  it('选择出 Alternation 分支', () => {
    const out = transform({ text: 'a|b' }, {})
    expect(out).toContain('Alternation')
    expect(out).toContain('Literal "a"')
    expect(out).toContain('Literal "b"')
  })

  it('分组出 Group 节点', () => {
    const out = transform({ text: '(ab)+' }, {})
    expect(out).toContain('Quantifier {1,∞}')
    expect(out).toContain('Group')
  })

  it('非捕获分组标注 non-capturing', () => {
    expect(transform({ text: '(?:ab)' }, {})).toContain('Group (non-capturing)')
  })

  it('命名分组标注名字', () => {
    expect(transform({ text: '(?<year>\\d+)' }, {})).toContain('Group (name=year)')
  })

  it('字符类与锚点', () => {
    const out = transform({ text: '^[0-9]$' }, {})
    expect(out).toContain('Anchor ^')
    expect(out).toContain('CharClass [0-9]')
    expect(out).toContain('Anchor $')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('非法正则抛中文错误', () => {
    expect(() => transform({ text: '(' }, {})).toThrow(/缺少/)
    expect(() => transform({ text: '(?x)' }, {})).toThrow(/不支持/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'a'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
