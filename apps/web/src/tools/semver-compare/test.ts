import { describe, expect, it } from 'vitest'
import { compare, describe as describeVer, parseVersion, transform } from './utils'

describe('semver-compare / parseVersion', () => {
  it('解析 core / prerelease / build', () => {
    const v = parseVersion('v1.2.3-beta.1+build.5')
    expect(v.major).toBe(1)
    expect(v.minor).toBe(2)
    expect(v.patch).toBe(3)
    expect(v.prerelease).toEqual(['beta', 1])
    expect(v.build).toBe('build.5')
  })

  it('非法版本抛错', () => {
    expect(() => parseVersion('1.2')).toThrow(/版本号非法/)
    expect(() => parseVersion('a.b.c')).toThrow(/版本号非法/)
  })
})

describe('semver-compare / compare', () => {
  it('core 数字比较', () => {
    expect(compare(parseVersion('1.2.3'), parseVersion('1.2.4'))).toBe(-1)
    expect(compare(parseVersion('2.0.0'), parseVersion('1.9.9'))).toBe(1)
    expect(compare(parseVersion('1.0.0'), parseVersion('1.0.0'))).toBe(0)
  })

  it('预发布号 < 正式版', () => {
    expect(compare(parseVersion('1.0.0-alpha'), parseVersion('1.0.0'))).toBe(-1)
  })

  it('预发布号按标识符比较：数字 < 字符串', () => {
    expect(compare(parseVersion('1.0.0-alpha.1'), parseVersion('1.0.0-alpha.beta'))).toBe(-1)
  })

  it('更长的同前缀预发布号更大', () => {
    expect(compare(parseVersion('1.0.0-alpha'), parseVersion('1.0.0-alpha.1'))).toBe(-1)
  })

  it('build metadata 不影响比较', () => {
    expect(compare(parseVersion('1.0.0+a'), parseVersion('1.0.0+b'))).toBe(0)
  })
})

describe('semver-compare / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('单行输入报错', () => {
    expect(() => transform({ text: '1.2.3' }, {})).toThrow(/分两行/)
  })

  it('正常比较输出结论', () => {
    const out = transform({ text: '1.2.3\n1.2.4' }, {})
    expect(out).toContain('1.2.3 < 1.2.4')
    expect(out).toContain('结论：1.2.3 小于 1.2.4')
  })

  it('describe 还原完整版本串', () => {
    expect(describeVer(parseVersion('1.2.3-beta.1+x'))).toBe('1.2.3-beta.1+x')
  })

  it('非法版本进入错误', () => {
    expect(() => transform({ text: 'foo\n1.0.0' }, {})).toThrow(/版本号非法/)
  })
})
