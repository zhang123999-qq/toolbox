/**
 * edge-redirect（#817）utils 单测：Bulk Redirects 规则生成与校验。
 */
import { describe, expect, it } from 'vitest'
import {
  buildRedirectRules,
  describeRules,
  EXAMPLE_RULE,
  parseRedirectRulesJson,
  validateFromPattern,
  validateRedirectRule,
  validateToUrl,
} from './utils'

describe('validateFromPattern', () => {
  it('路径式合法', () => {
    expect(validateFromPattern('/old/*')).toBeNull()
    expect(validateFromPattern('/a/b')).toBeNull()
  })
  it('完整 URL 式合法', () => {
    expect(validateFromPattern('https://old.example.com/*')).toBeNull()
  })
  it('空值报错', () => {
    expect(validateFromPattern('  ')).toBe('来源地址不能为空')
  })
  it('路径含空格报错', () => {
    expect(validateFromPattern('/a b')).toBe('来源路径不能包含空格')
  })
  it('URL 含空格报错', () => {
    expect(validateFromPattern('https://a b.com')).toBe('来源地址不能包含空格')
  })
  it('纯星号报错', () => {
    expect(validateFromPattern('*')).toBe('来源地址格式非法')
  })
  it('非 http 协议报错', () => {
    expect(validateFromPattern('ftp://a.com/*')).toBe('来源地址须为 http/https 或以 / 开头的路径')
  })
  it('畸形 URL 报错', () => {
    expect(validateFromPattern('https://')).toBe('来源地址格式非法')
  })
})

describe('validateToUrl', () => {
  it('合法 https', () => {
    expect(validateToUrl('https://new.example.com/x')).toBeNull()
  })
  it('空值报错', () => {
    expect(validateToUrl('')).toBe('目标地址不能为空')
  })
  it('非 http 协议报错', () => {
    expect(validateToUrl('ftp://a.com')).toBe('目标地址须为 http/https URL')
  })
  it('畸形报错', () => {
    expect(validateToUrl('not a url')).toBe('目标地址格式非法')
  })
})

describe('validateRedirectRule', () => {
  it('示例规则合法', () => {
    expect(validateRedirectRule(EXAMPLE_RULE)).toBeNull()
  })
  it('非法状态码报错', () => {
    expect(validateRedirectRule({ from: '/a', to: 'https://b.com', status: 200 as never })).toBe(
      '重定向状态码须为 301/302/307/308',
    )
  })
  it('来源非法透出', () => {
    expect(validateRedirectRule({ from: '', to: 'https://b.com', status: 302 })).toBe(
      '来源地址不能为空',
    )
  })
  it('目标非法透出', () => {
    expect(validateRedirectRule({ from: '/a', to: 'bad', status: 302 })).toBe('目标地址格式非法')
  })
})

describe('buildRedirectRules', () => {
  it('生成 JSON 结构', () => {
    const json = buildRedirectRules([
      EXAMPLE_RULE,
      { from: '/x', to: 'https://b.com/y', status: 308 },
    ])
    const parsed = JSON.parse(json)
    expect(parsed.redirects).toHaveLength(2)
    expect(parsed.redirects[0].source_url).toBe('https://old.example.com/*')
    expect(parsed.redirects[0].status_code).toBe(301)
    expect(parsed.redirects[1].subpath_matching).toBe(true)
  })
  it('非法规则抛错', () => {
    expect(() => buildRedirectRules([{ from: '/a', to: '', status: 301 }])).toThrow(
      '目标地址不能为空',
    )
  })
})

describe('parseRedirectRulesJson', () => {
  it('解析数组', () => {
    const rules = parseRedirectRulesJson(
      JSON.stringify([{ from: '/a', to: 'https://b.com', status: 302 }]),
    )
    expect(rules).toHaveLength(1)
    expect(rules[0].status).toBe(302)
  })
  it('解析 {redirects} 包裹', () => {
    const rules = parseRedirectRulesJson(
      JSON.stringify({
        redirects: [{ source_url: '/a', target_url: 'https://b.com', status_code: 307 }],
      }),
    )
    expect(rules[0].from).toBe('/a')
    expect(rules[0].status).toBe(307)
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseRedirectRulesJson('{bad')).toThrow('输入不是合法 JSON')
  })
  it('非数组结构抛错', () => {
    expect(() => parseRedirectRulesJson('{"a":1}')).toThrow(
      'JSON 须为规则数组或 {redirects: [...]} 结构',
    )
  })
  it('规则非法带序号抛错', () => {
    expect(() => parseRedirectRulesJson('[{"from":"/a","to":"","status":301}]')).toThrow(
      '第 1 条规则：目标地址不能为空',
    )
  })
  it('空对象规则带序号抛错', () => {
    expect(() => parseRedirectRulesJson('[{}]')).toThrow(
      '第 1 条规则：重定向状态码须为 301/302/307/308',
    )
  })
})

describe('describeRules', () => {
  it('空规则', () => {
    expect(describeRules([])).toBe('暂无规则')
  })
  it('多条摘要', () => {
    const text = describeRules([EXAMPLE_RULE])
    expect(text).toContain('https://old.example.com/* → https://new.example.com/（301）')
  })
})
