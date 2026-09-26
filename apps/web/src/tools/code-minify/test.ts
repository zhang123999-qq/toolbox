import { describe, expect, it } from 'vitest'
import { minifyCss, minifyHtml, minifyJs, transform } from './utils'
import type { CodeMinifyOptions } from './schema'

const base: CodeMinifyOptions = { language: 'js' }

describe('code-minify / minifyJs', () => {
  it('去掉行注释与块注释', () => {
    const out = minifyJs('function add(a,b){// hi\nreturn a+b;}/* bye */')
    expect(out).not.toContain('hi')
    expect(out).not.toContain('bye')
    expect(out).toContain('function add(a,b){')
  })

  it('字符串内的注释不被删除', () => {
    const out = minifyJs('const s="not // a comment";')
    expect(out).toContain('not // a comment')
  })

  it('字符串内的多空格不被压缩', () => {
    const out = minifyJs('const s="a   b";')
    expect(out).toBe('const s="a   b";')
  })

  it('模板字符串内的真实换行保留', () => {
    const out = minifyJs('const t=`a\nb`;')
    expect(out).toContain('`a\nb`')
  })

  it('行内多余空白压成单空格', () => {
    const out = minifyJs('let   x  =   1;  let y=2;')
    expect(out).toBe('let x = 1; let y=2;')
  })

  it('块注释删除后补空格，不粘连两侧标识符', () => {
    expect(minifyJs('a/*c*/b')).toBe('a b')
    expect(minifyJs('foo/*x*/bar')).toBe('foo bar')
  })

  it('保留换行以维持无分号代码的 ASI 语义', () => {
    const out = minifyJs('x=1\n(y)')
    expect(out).toBe('x=1\n(y)')
    expect(out).not.toContain('1 (y)') // 不能压成 x=1(y) 的函数调用
    // 有分号的语句行首空白被忽略、语句仍正确
    expect(minifyJs('a = 1;\n b = 2;')).toBe('a = 1;\nb = 2;')
  })
})

describe('code-minify / minifyCss', () => {
  it('去掉 CSS 注释并压缩空白', () => {
    const out = minifyCss('/* comment */.a { color: red; font-size: 14px; }')
    expect(out).not.toContain('comment')
    expect(out).toContain('.a { color: red; font-size: 14px; }')
  })

  it('去掉规则末尾分号', () => {
    const out = minifyCss('.a{color:red;}')
    expect(out).toBe('.a{color:red}')
  })

  it('字符串内多空格保留', () => {
    const out = minifyCss('.a{content:"a   b";}')
    expect(out).toBe('.a{content:"a   b"}')
  })
})

describe('code-minify / minifyHtml', () => {
  it('去掉 HTML 注释，标签间不留空白', () => {
    const out = minifyHtml('<div><!-- 注释 --><p>hi</p></div>')
    expect(out).not.toContain('注释')
    expect(out).toBe('<div><p>hi</p></div>')
  })
})

describe('code-minify / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('非法语言抛错', () => {
    const bad = { language: 'php' } as unknown as CodeMinifyOptions
    expect(() => transform({ text: 'x' }, bad)).toThrow(/不支持的语言/)
  })
})
