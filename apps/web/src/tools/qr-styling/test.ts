import { describe, expect, it } from 'vitest'
import {
  inFinder,
  matrixOf,
  matrixToStyledSvg,
  parseColor,
  parseDotStyle,
  parseMargin,
  resolveOptions,
  toSvgText,
} from './utils'

const OPTS = { dotStyle: 'square', color: '#000000', bgColor: '#ffffff', margin: '4' }

describe('qr-styling / matrixOf', () => {
  it('生成非空矩阵', () => {
    const m = matrixOf('hello')
    expect(m.size).toBeGreaterThan(0)
    expect(m.data.length).toBe(m.size * m.size)
    expect(m.data.some((v) => v !== 0)).toBe(true)
  })
})

describe('qr-styling / 选项校验', () => {
  it('点样式默认 square，非法抛错', () => {
    expect(parseDotStyle('')).toBe('square')
    expect(parseDotStyle('dot')).toBe('dot')
    expect(() => parseDotStyle('circle')).toThrow(/点样式无效/)
  })

  it('颜色校验 #rrggbb', () => {
    expect(parseColor('', '#000000')).toBe('#000000')
    expect(parseColor('#aBc123', '#000')).toBe('#abc123')
    expect(() => parseColor('red', '#000')).toThrow(/颜色无效/)
  })

  it('静默区 0–10', () => {
    expect(parseMargin('')).toBe(4)
    expect(() => parseMargin('11')).toThrow(/静默区无效/)
  })
})

describe('qr-styling / inFinder', () => {
  it('三个 7×7 角被识别为定位区', () => {
    const size = 25
    expect(inFinder(0, 0, size)).toBe(true)
    expect(inFinder(6, 6, size)).toBe(true)
    expect(inFinder(24, 0, size)).toBe(true)
    expect(inFinder(0, 24, size)).toBe(true)
    expect(inFinder(12, 12, size)).toBe(false)
  })
})

describe('qr-styling / matrixToStyledSvg', () => {
  it('三种点样式都产出合法 SVG', () => {
    const m = matrixOf('test')
    for (const style of ['square', 'dot', 'rounded'] as const) {
      const svg = matrixToStyledSvg(m.size, m.data, resolveOptions({ ...OPTS, dotStyle: style }))
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg).toContain('</svg>')
    }
  })

  it('前景 / 背景色写入 SVG', () => {
    const m = matrixOf('test')
    const svg = matrixToStyledSvg(m.size, m.data, {
      dotStyle: 'dot',
      color: '#ff0000',
      bgColor: '#eeeeee',
      margin: 4,
    })
    expect(svg).toContain('#ff0000')
    expect(svg).toContain('#eeeeee')
  })
})

describe('qr-styling / toSvgText', () => {
  it('空输入返回空串', () => {
    expect(toSvgText({ text: '' }, OPTS)).toBe('')
  })

  it('正常输出 SVG', () => {
    const out = toSvgText({ text: 'https://example.com' }, OPTS)
    expect(out).toContain('<svg')
    expect(out).toContain('</svg>')
  })

  it('非法颜色抛中文错', () => {
    expect(() => toSvgText({ text: 'hi' }, { ...OPTS, color: 'red' })).toThrow(/颜色无效/)
  })
})
