import { describe, expect, it } from 'vitest'
import type { FaviconOptions } from './schema'
import { buildFaviconSvg, hashText, initialOf, parseSize } from './utils'

const base: FaviconOptions = { size: '64', style: 'letter', bgColor: '', fgColor: '#ffffff' }

describe('favicon / hashText & initialOf', () => {
  it('相同文本哈希一致', () => {
    expect(hashText('F')).toBe(hashText('F'))
  })
  it('首字母大写 / 中文取首字', () => {
    expect(initialOf('foo')).toBe('F')
    expect(initialOf('首页')).toBe('首')
  })
})

describe('favicon / parseSize', () => {
  it('空返回默认 64', () => {
    expect(parseSize('')).toBe(64)
  })
  it('边界 16 / 256 合法', () => {
    expect(parseSize('16')).toBe(16)
    expect(parseSize('256')).toBe(256)
  })
  it('越界抛错', () => {
    expect(() => parseSize('15')).toThrow(/尺寸必须是/)
    expect(() => parseSize('257')).toThrow(/尺寸必须是/)
  })
})

describe('favicon / buildFaviconSvg', () => {
  it('输出包含 svg 标签与正确尺寸', () => {
    const svg = buildFaviconSvg({ text: 'F' }, { ...base, size: '32' }, 'seed')
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="32"')
    expect(svg).toContain('height="32"')
  })

  it('letter 样式包含首字母与背景色', () => {
    const svg = buildFaviconSvg({ text: 'F' }, base, 'seed')
    expect(svg).toContain('>F</text>')
  })

  it('指定背景色与前景色生效', () => {
    const svg = buildFaviconSvg(
      { text: 'A' },
      { ...base, bgColor: '#123456', fgColor: '#abcdef' },
      'seed',
    )
    expect(svg).toContain('#123456')
    expect(svg).toContain('#abcdef')
  })

  it('gradient 样式包含渐变', () => {
    const svg = buildFaviconSvg({ text: 'A' }, { ...base, style: 'gradient' }, 'seed')
    expect(svg).toContain('<linearGradient')
  })

  it('geometric 样式包含几何图形', () => {
    const svg = buildFaviconSvg({ text: 'A' }, { ...base, style: 'geometric' }, 'seed')
    expect(svg).toMatch(/<polygon|<circle/)
  })

  it('相同输入结果一致', () => {
    expect(buildFaviconSvg({ text: 'A' }, base, 'seed')).toBe(
      buildFaviconSvg({ text: 'A' }, base, 'seed'),
    )
  })

  it('非法尺寸抛错', () => {
    expect(() => buildFaviconSvg({ text: 'A' }, { ...base, size: '0' }, 'seed')).toThrow(
      /尺寸必须是/,
    )
  })
})
