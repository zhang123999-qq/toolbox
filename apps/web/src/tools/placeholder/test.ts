import { describe, expect, it } from 'vitest'
import type { PlaceholderOptions } from './schema'
import { buildPlaceholderSvg, parseSize } from './utils'

const base: PlaceholderOptions = { bgColor: '#cccccc', fgColor: '#666666', customText: '' }

describe('placeholder / parseSize', () => {
  it('空输入返回默认 400x300', () => {
    expect(parseSize('')).toEqual({ w: 400, h: 300 })
  })
  it('支持小写 x 与全角 ×', () => {
    expect(parseSize('300x200')).toEqual({ w: 300, h: 200 })
    expect(parseSize('300×200')).toEqual({ w: 300, h: 200 })
    expect(parseSize(' 300 x 200 ')).toEqual({ w: 300, h: 200 })
  })
  it('非法格式抛中文错', () => {
    expect(() => parseSize('abc')).toThrow(/尺寸格式不正确/)
    expect(() => parseSize('300-200')).toThrow(/尺寸格式不正确/)
    expect(() => parseSize('300')).toThrow(/尺寸格式不正确/)
  })
  it('越界抛错', () => {
    expect(() => parseSize('0x100')).toThrow(/尺寸必须在/)
    expect(() => parseSize('5000x100')).toThrow(/尺寸必须在/)
  })
})

describe('placeholder / buildPlaceholderSvg', () => {
  it('输出包含 svg 标签与正确尺寸', () => {
    const svg = buildPlaceholderSvg({ text: '300x200' }, base)
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="300"')
    expect(svg).toContain('height="200"')
    expect(svg).toContain('viewBox="0 0 300 200"')
  })

  it('默认显示尺寸文字', () => {
    const svg = buildPlaceholderSvg({ text: '300x200' }, base)
    expect(svg).toContain('300 × 200')
  })

  it('使用指定背景色与文字颜色', () => {
    const svg = buildPlaceholderSvg(
      { text: '200x100' },
      { bgColor: '#ff0000', fgColor: '#00ff00', customText: '' },
    )
    expect(svg).toContain('fill="#ff0000"')
    expect(svg).toContain('fill="#00ff00"')
  })

  it('自定义文字覆盖尺寸', () => {
    const svg = buildPlaceholderSvg({ text: '200x100' }, { ...base, customText: 'Logo' })
    expect(svg).toContain('>Logo</text>')
    expect(svg).not.toContain('200 × 100')
  })

  it('空输入使用默认尺寸', () => {
    const svg = buildPlaceholderSvg({ text: '' }, base)
    expect(svg).toContain('width="400"')
    expect(svg).toContain('height="300"')
  })

  it('非法尺寸抛错', () => {
    expect(() => buildPlaceholderSvg({ text: 'bad' }, base)).toThrow(/尺寸格式不正确/)
  })
})
