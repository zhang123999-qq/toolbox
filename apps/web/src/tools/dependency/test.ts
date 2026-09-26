import { describe, expect, it } from 'vitest'
import { analyze, classifyRange, parsePkg, render, transform } from './utils'

describe('dependency / classifyRange', () => {
  it('识别精确 / caret / tilde / 通配', () => {
    expect(classifyRange('1.2.3')).toBe('exact')
    expect(classifyRange('^1.2.3')).toBe('caret')
    expect(classifyRange('~1.2.3')).toBe('tilde')
    expect(classifyRange('*')).toBe('wildcard')
    expect(classifyRange('latest')).toBe('wildcard')
    expect(classifyRange('>=1.0.0 <2.0.0')).toBe('range')
  })
})

describe('dependency / analyze', () => {
  const pkg = parsePkg(
    JSON.stringify({
      dependencies: { react: '^18.0.0', lodash: '~4.17.0', chalk: '*', express: '4.18.2' },
      devDependencies: { react: '^18.0.0', vitest: '^1.0.0' },
    }),
  )

  it('统计三类依赖数量与去重总数', () => {
    const r = analyze(pkg)
    expect(r.depCount).toBe(4)
    expect(r.devCount).toBe(2)
    expect(r.total).toBe(5)
  })

  it('识别 dependencies 与 devDependencies 的重复', () => {
    expect(analyze(pkg).duplicates).toContain('react')
  })

  it('把 * 标为过时风险', () => {
    expect(analyze(pkg).risky).toContain('chalk@*')
  })

  it('版本范围分布计数正确', () => {
    const rc = analyze(pkg).rangeCounts
    expect(rc.caret).toBe(1)
    expect(rc.tilde).toBe(1)
    expect(rc.wildcard).toBe(1)
    expect(rc.exact).toBe(1)
  })
})

describe('dependency / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '   ' }, {})).toBe('')
  })

  it('非法 JSON 报错', () => {
    expect(() => transform({ text: '{oops' }, {})).toThrow(/无法解析/)
  })

  it('正常输入渲染报告', () => {
    const out = transform(
      {
        text: JSON.stringify({
          dependencies: { a: '^1.0.0' },
          devDependencies: {},
        }),
      },
      {},
    )
    expect(out).toContain('依赖概览')
    expect(out).toContain('dependencies：1')
  })

  it('render 含风险提示', () => {
    const out = render(analyze(parsePkg(JSON.stringify({ dependencies: { a: '*' } }))))
    expect(out).toContain('过时风险')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, {})).toThrow(/上限/)
  })
})
