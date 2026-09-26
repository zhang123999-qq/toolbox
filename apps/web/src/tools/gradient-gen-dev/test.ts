import { describe, expect, it } from 'vitest'
import { assertColor, buildGradient, normalizePos, transform } from './utils'
import type { GradientGenOptions } from './schema'

const base: GradientGenOptions = {
  type: 'linear',
  angle: '90',
  color1: '#ff0000',
  pos1: '0%',
  color2: '#0000ff',
  pos2: '100%',
  color3: '',
  pos3: '',
}

describe('gradient-gen-dev / assertColor', () => {
  it('接受 HEX / rgb() / 命名色', () => {
    expect(assertColor('#fff', 'c')).toBe('#fff')
    expect(assertColor('#ff0000', 'c')).toBe('#ff0000')
    expect(assertColor('red', 'c')).toBe('red')
  })

  it('空颜色与非法颜色抛错', () => {
    expect(() => assertColor('', 'c1')).toThrow(/c1 颜色不能为空/)
    expect(() => assertColor('#12', 'c1')).toThrow(/颜色格式非法/)
  })

  it('rgb() 内不允许 ;{} 注入', () => {
    expect(() => assertColor('rgb(0,0,0);}', 'c1')).toThrow(/颜色格式非法/)
    expect(assertColor('rgb(255,0,0)', 'c1')).toBe('rgb(255,0,0)')
    expect(assertColor('rgba(255,0,0,0.5)', 'c1')).toBe('rgba(255,0,0,0.5)')
  })
})

describe('gradient-gen-dev / normalizePos', () => {
  it('空位置为空串，百分比带前导空格', () => {
    expect(normalizePos('')).toBe('')
    expect(normalizePos('50%')).toBe(' 50%')
  })

  it('非法位置抛错', () => {
    expect(() => normalizePos('abc')).toThrow(/色标位置/)
  })
})

describe('gradient-gen-dev / buildGradient', () => {
  it('线性渐变输出 background', () => {
    expect(buildGradient(base)).toBe(
      'background: linear-gradient(90deg, #ff0000 0%, #0000ff 100%);',
    )
  })

  it('radial 不带角度', () => {
    expect(buildGradient({ ...base, type: 'radial' })).toBe(
      'background: radial-gradient(circle, #ff0000 0%, #0000ff 100%);',
    )
  })

  it('conic 带 from 角度', () => {
    expect(buildGradient({ ...base, type: 'conic' })).toBe(
      'background: conic-gradient(from 90deg, #ff0000 0%, #0000ff 100%);',
    )
  })

  it('填了 color3 才输出第三个色标', () => {
    const out = buildGradient({ ...base, color3: '#00ff00', pos3: '50%' })
    expect(out).toContain('#00ff00 50%')
  })

  it('空角度回退到默认', () => {
    expect(buildGradient({ ...base, angle: '' })).toContain('linear-gradient(180deg,')
  })
})

describe('gradient-gen-dev / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 background', () => {
    expect(transform({ text: 'go' }, base)).toContain('background:')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
