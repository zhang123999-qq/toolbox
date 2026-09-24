import { describe, expect, it } from 'vitest'
import { convert, transform } from './utils'
import type { ZhConvertOptions } from './schema'

const s2t: ZhConvertOptions = { mode: 's2t' }
const t2s: ZhConvertOptions = { mode: 't2s' }
const s2tw: ZhConvertOptions = { mode: 's2tw' }

describe('zh-convert / convert', () => {
  it('简体转繁体', () => {
    expect(convert('工具库软件', 's2t')).toBe('工具庫軟件')
  })

  it('繁体转简体', () => {
    expect(convert('工具庫軟件', 't2s')).toBe('工具库软件')
  })

  it('简体转台湾正体：opencc-js 的 tw 预设同样是字形转换', () => {
    expect(convert('工具库软件', 's2tw')).toBe(convert('工具库软件', 's2t'))
  })

  it('未知模式回落为简转繁', () => {
    expect(convert('软件', 'other')).toBe('軟件')
  })

  it('非中文内容原样保留', () => {
    expect(convert('Toolbox 870', 's2t')).toBe('Toolbox 870')
  })
})

describe('zh-convert / transform', () => {
  it('默认简转繁', () => {
    expect(transform({ text: '软件' }, s2t)).toBe('軟件')
  })

  it('繁转简与台湾正体模式', () => {
    expect(transform({ text: '工具庫軟件' }, t2s)).toBe('工具库软件')
    expect(transform({ text: '工具库软件' }, s2tw)).toBe('工具庫軟件')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, s2t)).toBe('')
  })
})
