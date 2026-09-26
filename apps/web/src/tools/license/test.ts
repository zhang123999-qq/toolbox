import { describe, expect, it } from 'vitest'
import type { LicenseOptions } from './schema'
import { buildLicense, transform } from './utils'

const base: LicenseOptions = { licenseType: 'MIT', author: '张三', year: '2026' }

describe('license / buildLicense', () => {
  it('MIT 含版权行与许可声明', () => {
    const out = buildLicense(base)
    expect(out).toContain('MIT License')
    expect(out).toContain('Copyright (c) 2026 张三')
    expect(out).toContain('Permission is hereby granted')
  })

  it('ISC 输出 ISC 文本', () => {
    expect(buildLicense({ ...base, licenseType: 'ISC' })).toContain('ISC License')
  })

  it('BSD-3 含三条条件', () => {
    const out = buildLicense({ ...base, licenseType: 'BSD-3-Clause' })
    expect(out).toContain('1. Redistributions of source code')
    expect(out).toContain('3. Neither the name')
  })

  it('Unlicense 不依赖作者年份', () => {
    expect(buildLicense({ ...base, licenseType: 'Unlicense' })).toContain('public domain')
  })

  it('Apache / GPL 给出正文链接', () => {
    expect(buildLicense({ ...base, licenseType: 'Apache-2.0' })).toContain('apache.org')
    expect(buildLicense({ ...base, licenseType: 'GPL-3.0' })).toContain('gnu.org/licenses')
  })

  it('非法许可证报错', () => {
    expect(() => buildLicense({ ...base, licenseType: 'WTFPL' as 'MIT' })).toThrow(/不支持的许可证/)
  })
})

describe('license / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('非空输入生成许可证', () => {
    expect(transform({ text: 'x' }, base)).toContain('MIT License')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
