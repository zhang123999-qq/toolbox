import { describe, expect, it } from 'vitest'
import { buildBorderRadius, normalizeCorner, transform } from './utils'
import type { BorderRadiusOptions } from './schema'

const base: BorderRadiusOptions = { tl: '8px', tr: '8px', br: '8px', bl: '8px' }

describe('border-radius-gen / normalizeCorner', () => {
  it('空值为 0px，无单位补 px', () => {
    expect(normalizeCorner('', 'x')).toBe('0px')
    expect(normalizeCorner('12', 'x')).toBe('12px')
    expect(normalizeCorner('50%', 'x')).toBe('50%')
  })

  it('非法值抛错', () => {
    expect(() => normalizeCorner('abc', '左上角')).toThrow(/左上角 格式非法/)
  })
})

describe('border-radius-gen / buildBorderRadius', () => {
  it('输出简写与分别写法', () => {
    const out = buildBorderRadius(base)
    expect(out).toContain('border-radius: 8px 8px 8px 8px;')
    expect(out).toContain('border-top-left-radius: 8px;')
    expect(out).toContain('border-bottom-right-radius: 8px;')
  })

  it('四个角不同时按顺序输出', () => {
    const out = buildBorderRadius({ tl: '2px', tr: '4px', br: '6px', bl: '8px' })
    expect(out.split('\n')[0]).toBe('border-radius: 2px 4px 6px 8px;')
  })
})

describe('border-radius-gen / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 border-radius', () => {
    expect(transform({ text: 'go' }, base)).toContain('border-radius:')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
