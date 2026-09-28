/**
 * userscript（#773）utils 单测：油猴脚本模板生成与校验。
 */
import { describe, expect, it } from 'vitest'
import {
  generateUserscript,
  parseUserscriptInput,
  validateUserMatchPattern,
  validateUserscriptMeta,
  type UserscriptMeta,
} from './utils'

const BASE: UserscriptMeta = {
  name: '示例脚本',
  namespace: 'https://example.com/ns',
  version: '1.0.0',
  description: '示例',
  author: '',
  matches: ['https://example.com/*'],
  grants: ['none'],
  runAt: 'document-end',
}

describe('validateUserMatchPattern', () => {
  it('合法模式通过', () => {
    expect(() => validateUserMatchPattern('https://a.com/*')).not.toThrow()
    expect(() => validateUserMatchPattern('<all_urls>')).not.toThrow()
  })
  it('非法输入报错', () => {
    expect(() => validateUserMatchPattern('')).toThrow('必须是非空字符串')
    expect(() => validateUserMatchPattern(42)).toThrow('必须是非空字符串')
    expect(() => validateUserMatchPattern('notaurl')).toThrow('非法匹配模式')
  })
})

describe('validateUserscriptMeta', () => {
  it('合法输入通过', () => {
    expect(() => validateUserscriptMeta(BASE)).not.toThrow()
  })
  it('非对象报错', () => {
    expect(() => validateUserscriptMeta(undefined as never)).toThrow('必须是对象')
  })
  it('必填字段为空报错', () => {
    for (const key of ['name', 'namespace', 'version', 'description'] as const) {
      expect(() => validateUserscriptMeta({ ...BASE, [key]: '  ' })).toThrow(`${key} 不能为空`)
    }
    expect(() => validateUserscriptMeta({ ...BASE, name: 1 as never })).toThrow('name 不能为空')
  })
  it('版本号非法报错', () => {
    expect(() => validateUserscriptMeta({ ...BASE, version: '1.0' })).toThrow('必须是 x.y.z')
    expect(() => validateUserscriptMeta({ ...BASE, version: 'v1.0.0' })).toThrow('必须是 x.y.z')
  })
  it('matches 非法报错', () => {
    expect(() => validateUserscriptMeta({ ...BASE, matches: [] })).toThrow('至少需要一个')
    expect(() => validateUserscriptMeta({ ...BASE, matches: ['bad'] })).toThrow('非法匹配模式')
  })
  it('grants 校验', () => {
    expect(() => validateUserscriptMeta({ ...BASE, grants: 'x' as never })).toThrow(
      'grants 必须是数组',
    )
    expect(() => validateUserscriptMeta({ ...BASE, grants: ['GM_hack'] })).toThrow('未知 grant')
    expect(() => validateUserscriptMeta({ ...BASE, grants: ['none', 'GM_log'] })).toThrow(
      '不能与其他 grant 混用',
    )
  })
  it('runAt 非法报错', () => {
    expect(() => validateUserscriptMeta({ ...BASE, runAt: 'x' as never })).toThrow('runAt 非法')
  })
})

describe('generateUserscript', () => {
  it('生成标准头注释与骨架', () => {
    const code = generateUserscript(BASE)
    expect(code).toContain('// ==UserScript==')
    expect(code).toContain('// ==/UserScript==')
    expect(code).toContain('@name')
    expect(code).toContain('示例脚本')
    expect(code).toContain('@version')
    expect(code).toContain('1.0.0')
    expect(code).toContain('@match')
    expect(code).toContain('https://example.com/*')
    expect(code).toContain('@grant')
    expect(code).toContain('none')
    expect(code).toContain('@run-at')
    expect(code).toContain('document-end')
    expect(code).toContain('(function() {')
  })
  it('author 为空时不输出 @author', () => {
    expect(generateUserscript(BASE)).not.toContain('@author')
    const code = generateUserscript({ ...BASE, author: 'rocky' })
    expect(code).toContain('@author')
    expect(code).toContain('rocky')
  })
  it('空 grants 默认 none', () => {
    const code = generateUserscript({ ...BASE, grants: [] })
    expect(code).toContain('none')
  })
  it('GM_addStyle 与 GM_registerMenuCommand 生成示例代码', () => {
    const code = generateUserscript({
      ...BASE,
      grants: ['GM_addStyle', 'GM_registerMenuCommand'],
    })
    expect(code).toContain("GM_addStyle('/* 你的 CSS 写在这里 */');")
    expect(code).toContain("GM_registerMenuCommand('运行'")
  })
  it('多 match 生成多行', () => {
    const code = generateUserscript({ ...BASE, matches: ['https://a.com/*', 'https://b.com/*'] })
    expect(code.match(/@match/g)?.length).toBe(2)
  })
  it('非法输入抛错', () => {
    expect(() => generateUserscript({ ...BASE, name: '' })).toThrow('name 不能为空')
  })
})

describe('parseUserscriptInput', () => {
  it('合法 JSON 解析', () => {
    const o = parseUserscriptInput(
      '{"name":"n","namespace":"ns","version":"2.3.4","description":"d","author":"a","matches":["https://a.com/*"],"grants":["GM_log"],"runAt":"document-start"}',
    )
    expect(o.name).toBe('n')
    expect(o.version).toBe('2.3.4')
    expect(o.author).toBe('a')
    expect(o.grants).toEqual(['GM_log'])
    expect(o.runAt).toBe('document-start')
  })
  it('缺省字段有默认值', () => {
    const o = parseUserscriptInput(
      '{"name":"n","namespace":"ns","version":"1.0.0","description":"d","matches":["https://a.com/*"]}',
    )
    expect(o.author).toBe('')
    expect(o.grants).toEqual([])
    expect(o.runAt).toBe('document-end')
  })
  it('非字符串字段走默认', () => {
    const o = parseUserscriptInput(
      '{"name":"n","namespace":"ns","version":"1.0.0","description":"d","matches":["https://a.com/*"],"runAt":5,"author":7}',
    )
    expect(o.runAt).toBe('document-end')
    expect(o.author).toBe('')
  })
  it('非字符串必填字段走默认空字符串', () => {
    expect(() =>
      parseUserscriptInput('{"name":1,"namespace":2,"version":3,"description":4}'),
    ).toThrow('name 不能为空')
  })
  it('非法 JSON 报错', () => {
    expect(() => parseUserscriptInput('{')).toThrow('不是合法 JSON')
  })
  it('非对象报错', () => {
    expect(() => parseUserscriptInput('[]')).toThrow('必须是 JSON 对象')
    expect(() => parseUserscriptInput('42')).toThrow('必须是 JSON 对象')
  })
  it('解析后仍做业务校验', () => {
    expect(() =>
      parseUserscriptInput(
        '{"name":"n","namespace":"ns","version":"bad","description":"d","matches":["https://a.com/*"]}',
      ),
    ).toThrow('必须是 x.y.z')
  })
})
