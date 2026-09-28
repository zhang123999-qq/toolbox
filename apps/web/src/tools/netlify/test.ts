/**
 * netlify（#815）utils 单测：TOML 生成、解析 round-trip 与错误分支。
 */
import { describe, expect, it } from 'vitest'
import {
  buildNetlifyToml,
  EXAMPLE_NETLIFY_TOML,
  parseNetlifyToml,
  summarizeNetlify,
  type NetlifyConfig,
} from './utils'

const VALID: NetlifyConfig = {
  build: { command: 'npm run build', publish: 'dist' },
  redirects: [{ from: '/old', to: '/new', status: 301, force: true }],
  headers: [{ for: '/*', values: { 'X-Frame-Options': 'DENY' } }],
}

describe('buildNetlifyToml', () => {
  it('示例 round-trip', () => {
    expect(buildNetlifyToml(parseNetlifyToml(EXAMPLE_NETLIFY_TOML))).toBe(EXAMPLE_NETLIFY_TOML)
  })
  it('生成内容符合预期', () => {
    const toml = buildNetlifyToml(VALID)
    expect(toml).toContain('[[redirects]]')
    expect(toml).toContain('from = "/old"')
    expect(toml).toContain('force = true')
    expect(toml).toContain('[headers.values]')
  })
  it('可选字段缺省时省略', () => {
    const toml = buildNetlifyToml({
      redirects: [{ from: '/a', to: '/b', status: 302 }],
      headers: [],
    })
    expect(toml).not.toContain('force')
    expect(toml).not.toContain('[build]')
  })
  it('force=false 输出', () => {
    const toml = buildNetlifyToml({
      redirects: [{ from: '/a', to: '/b', status: 302, force: false }],
      headers: [],
    })
    expect(toml).toContain('force = false')
  })
  it('build functions 输出', () => {
    const toml = buildNetlifyToml({
      build: { functions: 'netlify/functions' },
      redirects: [],
      headers: [],
    })
    expect(toml).toContain('functions = "netlify/functions"')
  })
  it('from 不以 / 开头抛错', () => {
    expect(() =>
      buildNetlifyToml({ redirects: [{ from: 'old', to: '/new', status: 301 }], headers: [] }),
    ).toThrow('redirects[0].from 必须以 / 开头')
  })
  it('to 不以 / 开头抛错', () => {
    expect(() =>
      buildNetlifyToml({ redirects: [{ from: '/old', to: 'new', status: 301 }], headers: [] }),
    ).toThrow('redirects[0].to 必须以 / 开头')
  })
  it('非法 status 抛错', () => {
    expect(() =>
      buildNetlifyToml({ redirects: [{ from: '/a', to: '/b', status: 999 }], headers: [] }),
    ).toThrow('redirects[0].status 非法：999')
  })
  it('headers for 非法抛错', () => {
    expect(() => buildNetlifyToml({ redirects: [], headers: [{ for: '*', values: {} }] })).toThrow(
      'headers[0].for 必须以 / 开头',
    )
  })
  it('字符串转义 round-trip', () => {
    const config: NetlifyConfig = {
      build: { command: 'echo "a\\b"\nsecond' },
      redirects: [],
      headers: [],
    }
    expect(parseNetlifyToml(buildNetlifyToml(config)).build?.command).toBe('echo "a\\b"\nsecond')
  })
})

describe('parseNetlifyToml', () => {
  it('解析示例', () => {
    expect(parseNetlifyToml(EXAMPLE_NETLIFY_TOML)).toEqual(VALID)
  })
  it('注释与空行被跳过', () => {
    const config = parseNetlifyToml('# c\n\n[[redirects]]\n  from = "/a"\n  to = "/b"\n')
    expect(config.redirects).toHaveLength(1)
    expect(config.redirects[0].status).toBe(301)
  })
  it('不支持的节抛错', () => {
    expect(() => parseNetlifyToml('[plugins]')).toThrow('不支持的节：[plugins]')
  })
  it('无等号行抛错', () => {
    expect(() => parseNetlifyToml('[build]\ncommand')).toThrow('第 2 行格式非法')
  })
  it('[headers.values] 位置非法抛错', () => {
    expect(() => parseNetlifyToml('[headers.values]')).toThrow('必须紧跟在 [[headers]] 之后')
  })
  it('[build] 未知键抛错', () => {
    expect(() => parseNetlifyToml('[build]\n  foo = "x"')).toThrow('[build] 不支持的键：foo')
  })
  it('[build] 非字符串值抛错', () => {
    expect(() => parseNetlifyToml('[build]\n  command = 1')).toThrow('command 须为字符串')
  })
  it('redirect from 非字符串抛错', () => {
    expect(() => parseNetlifyToml('[[redirects]]\n  from = 1')).toThrow('from 须为字符串')
  })
  it('redirect status 非数字抛错', () => {
    expect(() => parseNetlifyToml('[[redirects]]\n  status = "x"')).toThrow('status 须为数字')
  })
  it('redirect force=false 解析', () => {
    const config = parseNetlifyToml(
      '[[redirects]]\n  from = "/a"\n  to = "/b"\n  status = 302\n  force = false',
    )
    expect(config.redirects[0].force).toBe(false)
  })
  it('redirect force 非布尔抛错', () => {
    expect(() => parseNetlifyToml('[[redirects]]\n  force = "x"')).toThrow('force 须为布尔值')
  })
  it('redirect 未知键抛错', () => {
    expect(() => parseNetlifyToml('[[redirects]]\n  foo = "x"')).toThrow(
      '[[redirects]] 不支持的键：foo',
    )
  })
  it('headers 未知键抛错', () => {
    expect(() => parseNetlifyToml('[[headers]]\n  foo = "x"')).toThrow(
      '[[headers]] 不支持的键：foo',
    )
  })
  it('headers for 非字符串抛错', () => {
    expect(() => parseNetlifyToml('[[headers]]\n  for = 1')).toThrow('for 须为字符串')
  })
  it('响应头值非字符串抛错', () => {
    expect(() =>
      parseNetlifyToml('[[headers]]\n  for = "/"\n  [headers.values]\n    K = 1'),
    ).toThrow('响应头值须为字符串')
  })
  it('节外键值对抛错', () => {
    expect(() => parseNetlifyToml('foo = "x"')).toThrow('键值对出现在节之外')
  })
  it('值格式非法抛错', () => {
    expect(() => parseNetlifyToml('[build]\n  command = abc')).toThrow('值格式非法')
  })
  it('未知转义抛错', () => {
    expect(() => parseNetlifyToml('[build]\n  command = "a\\qb"')).toThrow('未知转义')
  })
  it('转义序列解析', () => {
    const config = parseNetlifyToml('[build]\n  command = "a\\"b\\\\c\\nd"')
    expect(config.build?.command).toBe('a"b\\c\nd')
  })
})

describe('summarizeNetlify', () => {
  it('含 build 摘要', () => {
    expect(summarizeNetlify(VALID)).toBe('含 [build]，redirects 1 条，headers 1 条')
  })
  it('无 build 摘要', () => {
    expect(summarizeNetlify({ redirects: [], headers: [] })).toBe('redirects 0 条，headers 0 条')
  })
})
