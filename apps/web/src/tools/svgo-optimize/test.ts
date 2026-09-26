import { describe, expect, it } from 'vitest'
import { optimizeSvg, transform } from './utils'
import type { SvgoOptimizeOptions } from './schema'

const base: SvgoOptimizeOptions = {}

describe('svgo-optimize / optimizeSvg', () => {
  it('去掉注释', () => {
    const out = optimizeSvg('<svg><!-- 注释 --><circle/></svg>')
    expect(out).not.toContain('注释')
    expect(out).toContain('<circle/>')
  })

  it('缩短数字精度', () => {
    const out = optimizeSvg('<svg><circle cx="50.000" cy="40.5000" r="1.23456"/></svg>')
    expect(out).toContain('cx="50"')
    expect(out).toContain('cy="40.5"')
    expect(out).toContain('r="1.23"')
  })

  it('去掉默认属性 stroke=none / stroke-width=1', () => {
    const out = optimizeSvg('<svg><circle stroke="none" stroke-width="1" fill="red"/></svg>')
    expect(out).not.toContain('stroke="none"')
    expect(out).not.toContain('stroke-width="1"')
    expect(out).toContain('fill="red"')
  })

  it('去掉 XML 声明', () => {
    const out = optimizeSvg('<?xml version="1.0"?><svg><circle/></svg>')
    expect(out).not.toContain('<?xml')
  })

  it('非 SVG 输入抛中文错误', () => {
    expect(() => optimizeSvg('<div>not svg</div>')).toThrow(/不是合法的 SVG/)
  })
})

describe('svgo-optimize / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('输出末尾带压缩率注释', () => {
    const out = transform({ text: '<svg><circle cx="50.000"/></svg>' }, base)
    expect(out).toContain('原始 ')
    expect(out).toContain('字符 → 优化后')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
