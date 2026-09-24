import { describe, expect, it } from 'vitest'
import { toFullWidth, toHalfWidth, transform } from './utils'
import type { FullwidthOptions } from './schema'

const toHalf: FullwidthOptions = { mode: 'toHalf' }
const toFull: FullwidthOptions = { mode: 'toFull' }

describe('fullwidth-halfwidth / toHalfWidth', () => {
  it('全角字母与数字转半角', () => {
    expect(toHalfWidth('ＡＢＣ１２３')).toBe('ABC123')
  })

  it('全角空格转为普通空格', () => {
    expect(toHalfWidth('Ａ　Ｂ')).toBe('A B')
  })

  it('中文与已半角字符不受影响', () => {
    expect(toHalfWidth('工具库 ABC')).toBe('工具库 ABC')
  })
})

describe('fullwidth-halfwidth / toFullWidth', () => {
  it('半角字母与数字转全角', () => {
    expect(toFullWidth('ABC123')).toBe('ＡＢＣ１２３')
  })

  it('普通空格转为全角空格', () => {
    expect(toFullWidth('A B')).toBe('\u3000'.length === 1 ? 'Ａ\u3000Ｂ' : 'Ａ　Ｂ')
  })

  it('往返转换可还原', () => {
    expect(toHalfWidth(toFullWidth('Toolbox 870'))).toBe('Toolbox 870')
  })
})

describe('fullwidth-halfwidth / transform', () => {
  it('默认转半角', () => {
    expect(transform({ text: '８７０' }, toHalf)).toBe('870')
  })

  it('指定 toFull 时转全角', () => {
    expect(transform({ text: '870' }, toFull)).toBe('８７０')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, toHalf)).toBe('')
  })
})
