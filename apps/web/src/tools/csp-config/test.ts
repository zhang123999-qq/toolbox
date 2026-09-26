import { describe, expect, it } from 'vitest'
import type { CspConfigOptions } from './schema'
import {
  assertOptions,
  buildDirectives,
  DIRECTIVES,
  headerName,
  SRC_VALUE,
  transform,
} from './utils'

const base: CspConfigOptions = {
  defaultSrc: 'self',
  scriptSrc: 'self',
  styleSrc: 'self',
  imgSrc: 'data',
  connectSrc: 'self',
  fontSrc: 'self',
  frameSrc: 'self',
  mediaSrc: 'self',
  objectSrc: 'none',
  baseUri: 'self',
  formAction: 'self',
  frameAncestors: 'none',
  upgradeInsecure: true,
  reportOnly: false,
}

describe('csp-config / SRC_VALUE', () => {
  it('预设映射正确', () => {
    expect(SRC_VALUE['self']).toBe("'self'")
    expect(SRC_VALUE['none']).toBe("'none'")
    expect(SRC_VALUE['all']).toBe('*')
    expect(SRC_VALUE['self-inline']).toBe("'self' 'unsafe-inline'")
    expect(SRC_VALUE['data']).toBe("'self' data:")
  })
})

describe('csp-config / buildDirectives', () => {
  it('按固定顺序输出全部指令', () => {
    const out = buildDirectives(base)
    expect(out[0]).toBe("default-src 'self'")
    expect(out).toContain("script-src 'self'")
    expect(out).toContain("img-src 'self' data:")
    expect(out).toContain("frame-ancestors 'none'")
  })

  it('升级 HTTPS 追加到末尾', () => {
    expect(buildDirectives(base)).toContain('upgrade-insecure-requests')
    expect(buildDirectives({ ...base, upgradeInsecure: false })).not.toContain(
      'upgrade-insecure-requests',
    )
  })

  it('script-src 选 self-inline 带上 unsafe-inline', () => {
    expect(buildDirectives({ ...base, scriptSrc: 'self-inline' })).toContain(
      "script-src 'self' 'unsafe-inline'",
    )
  })

  it('指令名不重复', () => {
    const names = buildDirectives(base).map((d) => d.split(' ')[0])
    expect(new Set(names).size).toBe(names.length)
  })

  it('覆盖全部 12 条指令', () => {
    expect(DIRECTIVES.length).toBe(12)
  })
})

describe('csp-config / headerName', () => {
  it('report-only 换头名', () => {
    expect(headerName(false)).toBe('Content-Security-Policy')
    expect(headerName(true)).toBe('Content-Security-Policy-Report-Only')
  })
})

describe('csp-config / assertOptions', () => {
  it('合法预设通过', () => {
    expect(() => assertOptions(base)).not.toThrow()
  })
  it('非法取值报错', () => {
    const bad = { ...base, scriptSrc: 'bogus' } as unknown as CspConfigOptions
    expect(() => assertOptions(bad)).toThrow(/取值非法/)
  })
})

describe('csp-config / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
  it('首行是单行 Header，随后可读版本', () => {
    const lines = transform({ text: 'x' }, base).split('\n')
    expect(lines[0].startsWith('Content-Security-Policy: ')).toBe(true)
    expect(lines[2]).toBe('# 可读版本（每条指令一行）')
  })
  it('report-only 换头名', () => {
    expect(transform({ text: 'x' }, { ...base, reportOnly: true }).split('\n')[0]).toContain(
      'Content-Security-Policy-Report-Only:',
    )
  })
  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
