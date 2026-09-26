import { describe, expect, it } from 'vitest'
import { matrixOf, matrixToSvg, transform } from './utils'

describe('qr-share-dev / matrixOf', () => {
  it('生成非空二维码矩阵', () => {
    const m = matrixOf('hello', 'M')
    expect(m.size).toBeGreaterThan(0)
    expect(m.version).toBeGreaterThan(0)
    expect(m.data.length).toBe(m.size * m.size)
  })

  it('不同文本产出不同矩阵', () => {
    const a = matrixOf('aaa', 'M')
    const b = matrixOf('bbb', 'M')
    let diff = 0
    for (let i = 0; i < a.data.length; i += 1) {
      if (a.data[i] !== b.data[i]) diff += 1
    }
    expect(diff).toBeGreaterThan(0)
  })
})

describe('qr-share-dev / matrixToSvg', () => {
  it('输出合法 SVG 字符串', () => {
    const m = matrixOf('test', 'M')
    const svg = matrixToSvg(m.size, m.data)
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
  })
})

describe('qr-share-dev / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { level: 'M' })).toBe('')
    expect(transform({ text: '   ' }, { level: 'M' })).toBe('')
  })

  it('非空输入输出 SVG 源码 + 元注释', () => {
    const out = transform({ text: 'https://example.com' }, { level: 'M' })
    expect(out).toContain('<!-- 版本')
    expect(out).toContain('<svg')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(2001) }, { level: 'M' })).toThrow(/上限/)
  })
})
