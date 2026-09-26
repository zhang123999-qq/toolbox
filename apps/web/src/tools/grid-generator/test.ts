import { describe, expect, it } from 'vitest'
import { buildCss, normalizeGap, normalizeTracks, transform } from './utils'
import type { GridGeneratorOptions } from './schema'

const base: GridGeneratorOptions = {
  columns: '1fr 1fr 1fr',
  rows: '',
  gap: '12px',
  justifyItems: 'stretch',
  alignItems: 'center',
}

describe('grid-generator / normalizeTracks', () => {
  it('空 rows 归一为 none', () => {
    expect(normalizeTracks('', 'rows')).toBe('none')
  })

  it('接受 fr / px / auto 轨道', () => {
    expect(normalizeTracks('1fr 1fr', 'columns')).toBe('1fr 1fr')
    expect(normalizeTracks('auto 100px', 'columns')).toBe('auto 100px')
  })

  it('非法轨道抛错', () => {
    expect(() => normalizeTracks('1fr @@@', 'columns')).toThrow(/columns 格式非法/)
  })
})

describe('grid-generator / normalizeGap', () => {
  it('空 gap 为 0，非法 gap 抛错', () => {
    expect(normalizeGap('')).toBe('0')
    expect(() => normalizeGap('bad')).toThrow(/gap 格式非法/)
  })
})

describe('grid-generator / buildCss', () => {
  it('输出 grid 规则', () => {
    const css = buildCss(base)
    expect(css).toContain('display: grid;')
    expect(css).toContain('grid-template-columns: 1fr 1fr 1fr;')
    expect(css).toContain('align-items: center;')
    expect(css).not.toContain('grid-template-rows')
  })

  it('填了 rows 才输出行模板', () => {
    expect(buildCss({ ...base, rows: 'auto 1fr' })).toContain('grid-template-rows: auto 1fr;')
  })
})

describe('grid-generator / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('触发即输出 CSS', () => {
    expect(transform({ text: 'go' }, base)).toContain('display: grid;')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
