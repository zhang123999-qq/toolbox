import { describe, expect, it } from 'vitest'
import { assertColor, assertLength, buildBoxShadow, transform } from './utils'
import type { BoxShadowOptions } from './schema'

const base: BoxShadowOptions = {
  offsetX: '0',
  offsetY: '4px',
  blur: '12px',
  spread: '0',
  color: 'rgba(0,0,0,0.15)',
  inset: false,
}

describe('box-shadow-gen / assertLength', () => {
  it('空值为 0px，无单位补 px', () => {
    expect(assertLength('', 'x')).toBe('0px')
    expect(assertLength('12', 'x')).toBe('12px')
    expect(assertLength('-3px', 'x')).toBe('-3px')
  })

  it('非法长度抛错', () => {
    expect(() => assertLength('abc', 'offsetX')).toThrow(/offsetX 格式非法/)
  })
})

describe('box-shadow-gen / assertColor', () => {
  it('空颜色与非法颜色抛错', () => {
    expect(() => assertColor('')).toThrow(/阴影颜色不能为空/)
    expect(() => assertColor('#12')).toThrow(/阴影颜色格式非法/)
  })

  it('rgb() 内不允许 ;{} 注入', () => {
    expect(() => assertColor('rgb(0,0,0);}')).toThrow(/颜色格式非法/)
    expect(assertColor('rgba(0,0,0,0.15)')).toBe('rgba(0,0,0,0.15)')
  })
})

describe('box-shadow-gen / buildBoxShadow', () => {
  it('输出 box-shadow 简写', () => {
    expect(buildBoxShadow(base)).toBe('box-shadow: 0px 4px 12px 0px rgba(0,0,0,0.15);')
  })

  it('勾选 inset 后加 inset 前缀', () => {
    expect(buildBoxShadow({ ...base, inset: true })).toBe(
      'box-shadow: inset 0px 4px 12px 0px rgba(0,0,0,0.15);',
    )
  })

  it('负数偏移也合法', () => {
    expect(buildBoxShadow({ ...base, offsetX: '-2' })).toContain('-2px 4px')
  })
})

describe('box-shadow-gen / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 box-shadow', () => {
    expect(transform({ text: 'go' }, base)).toContain('box-shadow:')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
