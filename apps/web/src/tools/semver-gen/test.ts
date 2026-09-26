import { describe, expect, it } from 'vitest'
import { bumpVersion, parse, transform } from './utils'

describe('semver-gen / bumpVersion', () => {
  it('major/minor/patch 递增', () => {
    expect(bumpVersion('1.4.2', 'major', 'beta')).toBe('2.0.0')
    expect(bumpVersion('1.4.2', 'minor', 'beta')).toBe('1.5.0')
    expect(bumpVersion('1.4.2', 'patch', 'beta')).toBe('1.4.3')
  })

  it('pre* 进入预发布', () => {
    expect(bumpVersion('1.4.2', 'premajor', 'rc')).toBe('2.0.0-rc.0')
    expect(bumpVersion('1.4.2', 'preminor', 'beta')).toBe('1.5.0-beta.0')
    expect(bumpVersion('1.4.2', 'prepatch', 'beta')).toBe('1.4.3-beta.0')
  })

  it('prerelease：非预发布号先进入预发布', () => {
    expect(bumpVersion('1.4.2', 'prerelease', 'beta')).toBe('1.4.3-beta.0')
  })

  it('prerelease：已是预发布号则数字段 +1', () => {
    expect(bumpVersion('1.4.2-beta.0', 'prerelease', 'beta')).toBe('1.4.2-beta.1')
  })

  it('容忍前导 v', () => {
    expect(bumpVersion('v1.4.2', 'minor', 'beta')).toBe('1.5.0')
  })

  it('非法版本抛错', () => {
    expect(() => bumpVersion('1.4', 'patch', 'beta')).toThrow(/版本号非法/)
  })
})

describe('semver-gen / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { bump: 'patch', preId: 'beta' })).toBe('')
  })

  it('输出下一版本与 changelog 建议', () => {
    const out = transform({ text: '1.4.2' }, { bump: 'minor', preId: 'beta' })
    expect(out).toContain('下一版本：1.5.0')
    expect(out).toContain('## [1.5.0]')
  })

  it('非法 bump 抛错', () => {
    expect(() => transform({ text: '1.0.0' }, { bump: 'bogus' as 'patch', preId: 'beta' })).toThrow(
      /不支持的 bump/,
    )
  })

  it('parse 拆出 core', () => {
    const v = parse('2.0.0-rc.1')
    expect(v).toMatchObject({ major: 2, minor: 0, patch: 0 })
    expect(v.pre).toEqual(['rc', '1'])
  })

  it('预发布标识符本身含连字符时不丢段', () => {
    const v = parse('1.4.2-rc-1')
    expect(v.pre).toEqual(['rc-1'])
    // 末尾段非纯数字 → 追加 .0
    expect(bumpVersion('1.4.2-rc-1', 'prerelease', 'beta')).toBe('1.4.2-rc-1.0')
  })
})
