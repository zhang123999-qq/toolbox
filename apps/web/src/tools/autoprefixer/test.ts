import { describe, expect, it } from 'vitest'
import { autoprefix, transform } from './utils'
import type { AutoprefixerOptions } from './schema'

const base: AutoprefixerOptions = {}

describe('autoprefixer / autoprefix', () => {
  it('display:flex 补三套 display', () => {
    const out = autoprefix('.a { display: flex; }')
    expect(out).toContain('display: -webkit-box;')
    expect(out).toContain('display: -ms-flexbox;')
    expect(out).toContain('display: flex;')
  })

  it('transform 加 -webkit- 与 -ms- 前缀', () => {
    const out = autoprefix('.a { transform: translateX(10px); }')
    expect(out).toContain('-webkit-transform: translateX(10px);')
    expect(out).toContain('-ms-transform: translateX(10px);')
    expect(out).toContain('transform: translateX(10px);')
  })

  it('user-select 加三套前缀', () => {
    const out = autoprefix('.a { user-select: none; }')
    expect(out).toContain('-webkit-user-select: none;')
    expect(out).toContain('-moz-user-select: none;')
    expect(out).toContain('-ms-user-select: none;')
    expect(out).toContain('user-select: none;')
  })

  it('background 里的 linear-gradient 加 -webkit- 前缀', () => {
    const out = autoprefix('.a { background: linear-gradient(red, blue); }')
    expect(out).toContain('background: -webkit-linear-gradient(red, blue);')
    expect(out).toContain('background: linear-gradient(red, blue);')
  })

  it('不在规则表里的属性原样保留', () => {
    const out = autoprefix('.a { color: red; margin: 0; }')
    expect(out).toContain('color: red;')
    expect(out).toContain('margin: 0;')
    expect(out).not.toContain('-webkit-color')
  })

  it('@media 块整体透传不破坏结构', () => {
    const out = autoprefix('@media (max-width: 600px) { .a { display: flex; } }')
    expect(out).toContain('@media (max-width: 600px)')
  })
})

describe('autoprefixer / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
