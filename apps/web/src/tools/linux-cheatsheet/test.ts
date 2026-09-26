import { describe, expect, it } from 'vitest'
import type { LinuxCheatsheetOptions } from './schema'
import { CATEGORY_TITLES, SECTIONS, assertCategory, transform } from './utils'

const base: LinuxCheatsheetOptions = { category: 'all' }

describe('linux-cheatsheet / 数据', () => {
  it('8 个分类都有命令', () => {
    expect(SECTIONS.length).toBe(8)
    for (const s of SECTIONS) expect(s.commands.length).toBeGreaterThanOrEqual(4)
  })

  it('命令总数不少于 50', () => {
    const total = SECTIONS.reduce((n, s) => n + s.commands.length, 0)
    expect(total).toBeGreaterThanOrEqual(50)
  })

  it('分类 key 都有中文标题', () => {
    for (const s of SECTIONS) expect(CATEGORY_TITLES[s.key]).toBeTruthy()
  })
})

describe('linux-cheatsheet / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('all 输出所有分类', () => {
    const out = transform({ text: 'x' }, base)
    expect(out).toContain('## 文件')
    expect(out).toContain('## 网络')
    expect(out).toContain('## 压缩')
  })

  it('按分类过滤', () => {
    const out = transform({ text: 'x' }, { category: 'disk' })
    expect(out).toContain('## 磁盘')
    expect(out).toContain('df -h')
    expect(out).not.toContain('## 文件')
  })

  it('输出三列表', () => {
    expect(transform({ text: 'x' }, { category: 'process' })).toContain('命令 | 说明 | 示例')
  })

  it('非法分类报错', () => {
    expect(() => assertCategory('nope')).toThrow(/不支持的分类/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
