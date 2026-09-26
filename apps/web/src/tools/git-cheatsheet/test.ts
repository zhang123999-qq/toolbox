import { describe, expect, it } from 'vitest'
import type { GitCheatsheetOptions } from './schema'
import { CATEGORY_TITLES, SECTIONS, assertCategory, transform } from './utils'

const base: GitCheatsheetOptions = { category: 'all' }

describe('git-cheatsheet / 数据完整性', () => {
  it('覆盖全部 8 个真实分类且每个分类都有命令', () => {
    expect(SECTIONS.length).toBe(8)
    for (const s of SECTIONS) expect(s.commands.length).toBeGreaterThanOrEqual(5)
  })

  it('命令总数不少于 40', () => {
    const total = SECTIONS.reduce((n, s) => n + s.commands.length, 0)
    expect(total).toBeGreaterThanOrEqual(40)
  })

  it('分类 key 与选项值一一对应', () => {
    for (const s of SECTIONS) expect(CATEGORY_TITLES[s.key]).toBeTruthy()
  })
})

describe('git-cheatsheet / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('all 输出全部分类标题', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('## 基础')
    expect(out).toContain('## 分支')
    expect(out).toContain('## 远程')
  })

  it('按分类过滤时只输出该分类', () => {
    const out = transform({ text: 'x' }, { category: 'stash' })
    expect(out).toContain('## 储藏')
    expect(out).toContain('git stash pop')
    expect(out).not.toContain('## 分支')
  })

  it('输出为命令|说明|示例三列表', () => {
    const out = transform({ text: 'x' }, { category: 'base' })
    expect(out).toContain('命令 | 说明 | 示例')
    expect(out).toContain('git clone <url> | ')
  })

  it('非法分类报错', () => {
    expect(() => assertCategory('bogus')).toThrow(/不支持的分类/)
    expect(() =>
      transform({ text: 'x' }, { category: 'bogus' } as unknown as GitCheatsheetOptions),
    ).toThrow(/不支持的分类/)
  })

  it('超过长度上限报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
