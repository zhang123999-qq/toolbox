import { describe, expect, it } from 'vitest'
import { render, tokenize, transform } from './utils'

describe('ast-viewer / tokenize', () => {
  it('切分关键字/标识符/字符串/标点', () => {
    const ts = tokenize("const a = 'x'")
    expect(ts.map((t) => t.value)).toEqual(['const', 'a', '=', "'x'"])
    expect(ts[0].type).toBe('kw')
    expect(ts[1].type).toBe('id')
    expect(ts[2].type).toBe('pun')
    expect(ts[3].type).toBe('str')
  })

  it('跳过注释与空白', () => {
    const ts = tokenize('// 注释\nconst a = 1\n/* 块 */')
    expect(ts.map((t) => t.value)).toEqual(['const', 'a', '=', '1'])
  })
})

describe('ast-viewer / transform', () => {
  it('识别函数/常量/if/return 缩进层级', () => {
    const out = transform({ text: 'function f(x) { const y = 1; if (x) { return y } }' }, {})
    expect(out).toContain('Program')
    expect(out).toContain('FunctionDecl f(x)')
    expect(out).toContain('ConstDecl y = 1')
    expect(out).toContain('IfStmt x')
    expect(out).toContain('ReturnStmt y')
  })

  it('识别 class 与 method', () => {
    const out = transform({ text: 'class A { foo() { return 1 } }' }, {})
    expect(out).toContain('ClassDecl A')
    expect(out).toContain('Method foo()')
  })

  it('识别 import / export', () => {
    const out = transform({ text: "import { a } from 'b'; export const c = 2" }, {})
    expect(out).toContain('ImportDecl')
    expect(out).toContain('ExportDecl')
  })

  it('识别 for / while', () => {
    const out = transform({ text: 'for (let i = 0; i < 10; i++) { break } while (x) {}' }, {})
    expect(out).toContain('ForStmt let i = 0 ; i < 10 ; i ++')
    expect(out).toContain('WhileStmt x')
    expect(out).toContain('BreakStmt')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('括号不匹配抛中文错误', () => {
    expect(() => transform({ text: 'function f( {' }, {})).toThrow(/语法错误/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })

  it('render 对空节点返回单行', () => {
    expect(render({ kind: 'Program', detail: '', children: [] })).toBe('Program')
  })
})
