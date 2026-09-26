import { describe, expect, it } from 'vitest'
import type { GitignoreOptions } from './schema'
import { TEMPLATES, transform } from './utils'

function opts(over: Partial<GitignoreOptions>): GitignoreOptions {
  return {
    node: false,
    python: false,
    java: false,
    go: false,
    rust: false,
    php: false,
    ruby: false,
    dotnet: false,
    macos: false,
    windows: false,
    linux: false,
    docker: false,
    ide: false,
    ...over,
  }
}

describe('gitignore / 数据', () => {
  it('13 个模板都非空', () => {
    for (const lines of Object.values(TEMPLATES)) expect(lines.length).toBeGreaterThan(0)
  })
})

describe('gitignore / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, opts({}))).toBe('')
  })

  it('勾选 node 输出 node 模板', () => {
    const out = transform({ text: 'x' }, opts({ node: true }))
    expect(out).toContain('node_modules/')
    expect(out).toContain('# Node')
  })

  it('多个勾选按顺序合并', () => {
    const out = transform({ text: 'x' }, opts({ node: true, python: true }))
    expect(out.indexOf('# Node')).toBeLessThan(out.indexOf('# Python'))
    expect(out).toContain('__pycache__/')
  })

  it('一个都不勾选时报错', () => {
    expect(() => transform({ text: 'x' }, opts({}))).toThrow(/至少勾选/)
  })

  it('模板之间用空行分隔', () => {
    const out = transform({ text: 'x' }, opts({ node: true, go: true }))
    expect(out).toContain('.env\n\n# Go')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, opts({ node: true }))).toThrow(/上限/)
  })
})
