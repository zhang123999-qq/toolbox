import { describe, expect, it } from 'vitest'
import { matrixOf, matrixToSvg, parseLevel, parseSize, transform } from './utils'

describe('qrcode / matrixOf', () => {
  it('生成非空二维码矩阵', () => {
    const m = matrixOf('hello', 'M')
    expect(m.size).toBeGreaterThan(0)
    expect(m.version).toBeGreaterThan(0)
    expect(m.data.length).toBe(m.size * m.size)
    // 矩阵中至少有一个黑模块
    expect(m.data.some((v) => v !== 0)).toBe(true)
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

  it('不同容错级别可生成', () => {
    for (const level of ['L', 'M', 'Q', 'H']) {
      const m = matrixOf('test', level)
      expect(m.size).toBeGreaterThan(0)
    }
  })
})

describe('qrcode / matrixToSvg', () => {
  it('输出合法 SVG 字符串且含静默区', () => {
    const m = matrixOf('test', 'M')
    const svg = matrixToSvg(m.size, m.data, 256)
    expect(svg.startsWith('<svg ')).toBe(true)
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
    expect(svg).toContain('width:256px')
  })
})

describe('qrcode / parseLevel & parseSize', () => {
  it('默认容错为 M，非法级别抛中文错', () => {
    expect(parseLevel('')).toBe('M')
    expect(parseLevel('h')).toBe('H')
    expect(() => parseLevel('X')).toThrow(/容错级别无效/)
  })

  it('尺寸校验与默认值', () => {
    expect(parseSize('')).toBe(256)
    expect(parseSize('512')).toBe(512)
    expect(() => parseSize('0')).toThrow(/尺寸无效/)
    expect(() => parseSize('abc')).toThrow(/尺寸无效/)
  })
})

describe('qrcode / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { level: 'M', size: '256' })).toBe('')
    expect(transform({ text: '   ' }, { level: 'M', size: '256' })).toBe('')
  })

  it('正常生成输出 SVG + 元注释', () => {
    const out = transform({ text: 'https://example.com' }, { level: 'M', size: '256' })
    expect(out).toContain('<!-- 版本')
    expect(out).toContain('<svg')
    expect(out).toContain('</svg>')
  })

  it('超长输入抛中文错', () => {
    expect(() => transform({ text: 'x'.repeat(2001) }, { level: 'M', size: '256' })).toThrow(
      /超过.*字符上限/,
    )
  })

  it('非法选项抛中文错', () => {
    expect(() => transform({ text: 'hi' }, { level: 'X', size: '256' })).toThrow(/容错级别无效/)
    expect(() => transform({ text: 'hi' }, { level: 'M', size: '9999' })).toThrow(/尺寸无效/)
  })
})
