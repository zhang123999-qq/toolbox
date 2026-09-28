import { describe, expect, it } from 'vitest'
import type { LogoOptions } from './schema'
import { buildLogoSvg, DEFAULT_BRAND, hashText, mulberry32 } from './utils'

const base: LogoOptions = {
  style: 'minimal',
  primaryColor: '',
  secondaryColor: '',
  iconShape: 'circle',
}

describe('logo / hashText & mulberry32', () => {
  it('相同品牌哈希一致', () => {
    expect(hashText('Acme')).toBe(hashText('Acme'))
  })
  it('mulberry32 确定性', () => {
    expect(mulberry32(7)()).toBe(mulberry32(7)())
  })
})

describe('logo / buildLogoSvg', () => {
  it('输出包含 svg 标签与固定画布尺寸', () => {
    const svg = buildLogoSvg({ text: 'Acme' }, base, 'seed')
    expect(svg).toContain('<svg')
    expect(svg).toContain('width="320"')
    expect(svg).toContain('viewBox="0 0 320 96"')
  })

  it('品牌名以文字渲染', () => {
    const svg = buildLogoSvg({ text: 'Acme' }, base, 'seed')
    expect(svg).toContain('>Acme</text>')
  })

  it('空品牌名使用默认品牌', () => {
    const svg = buildLogoSvg({ text: '' }, base, 'seed')
    expect(svg).toContain(DEFAULT_BRAND)
  })

  it('指定主色时使用该颜色', () => {
    const svg = buildLogoSvg({ text: 'Acme' }, { ...base, primaryColor: '#112233' }, 'seed')
    expect(svg).toContain('#112233')
  })

  it('gradient 样式包含渐变与首字母', () => {
    const svg = buildLogoSvg({ text: 'Acme' }, { ...base, style: 'gradient' }, 'seed')
    expect(svg).toContain('<linearGradient')
    expect(svg).toContain('>A</text>')
  })

  it('badge 样式包含五角星多边形', () => {
    const svg = buildLogoSvg({ text: 'Acme' }, { ...base, style: 'badge' }, 'seed')
    expect(svg).toContain('<polygon')
  })

  it('相同品牌相同选项结果一致', () => {
    expect(buildLogoSvg({ text: 'Acme' }, base, 'seed')).toBe(
      buildLogoSvg({ text: 'Acme' }, base, 'seed'),
    )
  })

  it('未知样式抛错', () => {
    expect(() => buildLogoSvg({ text: 'Acme' }, { ...base, style: '3d' }, 'seed')).toThrow(
      /未知的 Logo 样式/,
    )
  })
})
