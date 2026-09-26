import { describe, expect, it } from 'vitest'
import type { BadgeOptions } from './schema'
import { badgeUrl, buildBadge, transform } from './utils'

const base: BadgeOptions = { label: 'version', message: '1.2.0', color: 'brightgreen' }

describe('badge / badgeUrl', () => {
  it('拼出标准 shields URL', () => {
    expect(badgeUrl(base)).toBe('https://img.shields.io/badge/version-1.2.0-brightgreen')
  })

  it('连字符转义为双连字符', () => {
    expect(badgeUrl({ label: 'build status', message: 'ok', color: 'green' })).toBe(
      'https://img.shields.io/badge/build_status-ok-green',
    )
  })

  it('空值回退默认段', () => {
    expect(badgeUrl({ label: '', message: '', color: '' })).toBe(
      'https://img.shields.io/badge/label-message-brightgreen',
    )
  })
})

describe('badge / buildBadge', () => {
  it('输出 URL + Markdown + HTML 三段', () => {
    const out = buildBadge(base)
    expect(out).toContain('# Markdown')
    expect(out).toContain('![version 1.2.0](')
    expect(out).toContain('# HTML')
    expect(out).toContain('<img src="https://img.shields.io/badge/version-1.2.0-brightgreen"')
  })
})

describe('badge / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非空输入生成徽章', () => {
    expect(transform({ text: 'x' }, base)).toContain('img.shields.io')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
