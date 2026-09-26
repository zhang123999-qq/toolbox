import { describe, expect, it } from 'vitest'
import {
  beautifyCss,
  beautifyHtml,
  beautifyJs,
  beautifyJson,
  beautifySql,
  indentUnit,
  transform,
} from './utils'
import type { CodeBeautifyOptions } from './schema'

const base: CodeBeautifyOptions = { language: 'js', indent: '2' }

describe('code-beautify / indentUnit', () => {
  it('2 与 4 给对应空格，tab 给制表符', () => {
    expect(indentUnit('2')).toBe('  ')
    expect(indentUnit('4')).toBe('    ')
    expect(indentUnit('tab')).toBe('\t')
  })
})

describe('code-beautify / beautifyJs', () => {
  it('花括号产生缩进层级，分号后换行', () => {
    const out = beautifyJs('function add(a,b){return a+b;}', '  ')
    expect(out.split('\n')[0]).toBe('function add(a,b) {')
    expect(out.split('\n')[1]).toBe('  return a+b;')
    expect(out.split('\n')[2]).toBe('}')
  })

  it('字符串里的括号不影响缩进', () => {
    const out = beautifyJs('const s="a}b{c";', '  ')
    expect(out).toBe('const s="a}b{c";')
  })

  it('闭合括号单独成行并回退缩进', () => {
    const out = beautifyJs('if(a){b();}', '  ')
    expect(out.split('\n')).toContain('}')
    expect(out.split('\n').length).toBeGreaterThanOrEqual(3)
  })
})

describe('code-beautify / beautifyCss', () => {
  it('选择器与 { 同行，声明每条一行并缩进', () => {
    const out = beautifyCss('.a{color:red;font-size:14px;}', '  ')
    expect(out.split('\n')[0]).toBe('.a {')
    expect(out.split('\n')[1]).toBe('  color:red;')
    expect(out.split('\n')[2]).toBe('  font-size:14px;')
    expect(out.split('\n')[3]).toBe('}')
  })
})

describe('code-beautify / beautifyHtml', () => {
  it('嵌套标签逐层缩进', () => {
    const out = beautifyHtml('<div><p>hi</p></div>', '  ')
    const lines = out.split('\n')
    expect(lines[0]).toBe('<div>')
    expect(lines[1]).toBe('  <p>')
    expect(lines[2]).toBe('    hi')
    expect(lines[3]).toBe('  </p>')
    expect(lines[4]).toBe('</div>')
  })
})

describe('code-beautify / beautifyJson', () => {
  it('合法 JSON 用指定缩进重排', () => {
    expect(beautifyJson('{"a":1,"b":[1,2]}', '  ')).toBe(
      '{\n  "a": 1,\n  "b": [\n    1,\n    2\n  ]\n}',
    )
  })

  it('非法 JSON 抛中文错误', () => {
    expect(() => beautifyJson('{oops', '  ')).toThrow(/JSON 解析失败/)
  })
})

describe('code-beautify / beautifySql', () => {
  it('子句关键字各自成行', () => {
    const out = beautifySql('select id from users where id=1', '  ')
    expect(out).toContain('select id')
    expect(out).toContain('from users')
    expect(out).toContain('where id=1')
  })

  it('字符串字面量内的 WHERE/SELECT 不触发换行', () => {
    const out = beautifySql("select * from t where x = 'a where b'", '  ')
    expect(out).toBe("select *\nfrom t\nwhere x = 'a where b'")
  })

  it('空串返回空', () => {
    expect(beautifySql('   ', '  ')).toBe('')
  })
})

describe('code-beautify / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })

  it('非法语言抛中文错误', () => {
    const bad = { ...base, language: 'python' } as unknown as CodeBeautifyOptions
    expect(() => transform({ text: 'x' }, bad)).toThrow(/不支持的语言/)
  })
})
