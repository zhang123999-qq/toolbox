import { describe, expect, it } from 'vitest'
import type { VimCheatsheetOptions } from './schema'
import { SECTIONS, assertCategory, transform } from './utils'

const base: VimCheatsheetOptions = { category: 'all' }

describe('vim-cheatsheet / 数据', () => {
  it('7 个分类都有命令', () => {
    expect(SECTIONS.length).toBe(7)
    for (const s of SECTIONS) expect(s.commands.length).toBeGreaterThanOrEqual(4)
  })

  it('命令总数不少于 40', () => {
    const total = SECTIONS.reduce((n, s) => n + s.commands.length, 0)
    expect(total).toBeGreaterThanOrEqual(40)
  })
})

describe('vim-cheatsheet / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('all 输出全部分类', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('## 移动')
    expect(out).toContain('## 编辑')
    expect(out).toContain('## 窗口')
  })

  it('按分类过滤', () => {
    const out = transform({ text: 'x' }, { category: 'search' })
    expect(out).toContain('/text')
    expect(out).not.toContain('## 编辑')
  })

  it('输出 按键|说明 两列表', () => {
    expect(transform({ text: 'x' }, { category: 'mode' })).toContain('按键 | 说明')
  })

  it('非法分类报错', () => {
    expect(() => assertCategory('nope')).toThrow(/不支持的分类/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
