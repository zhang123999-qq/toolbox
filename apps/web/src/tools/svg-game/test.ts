/**
 * svg-game（#795）utils 单测：SVG 游戏资源。
 */
import { describe, expect, it } from 'vitest'
import {
  SPRITE_TEMPLATES,
  getSpriteTemplate,
  listSpriteTemplates,
  renderAllSprites,
  renderSpriteTemplate,
} from './utils'

describe('listSpriteTemplates', () => {
  it('返回 8 个模板元信息', () => {
    const list = listSpriteTemplates()
    expect(list).toHaveLength(8)
    expect(list.map((t) => t.id)).toContain('slime')
    expect(list.map((t) => t.id)).toContain('coin')
  })
  it('元信息不含 render 函数', () => {
    for (const t of listSpriteTemplates()) {
      expect('render' in t).toBe(false)
      expect(t.defaultPrimary).toMatch(/^#[0-9a-fA-F]{6}$/)
      expect(t.defaultSecondary).toMatch(/^#[0-9a-fA-F]{6}$/)
    }
  })
  it('模板 id 唯一', () => {
    const ids = SPRITE_TEMPLATES.map((t) => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })
  it('分类覆盖角色/道具/地形/特效', () => {
    const cats = new Set(listSpriteTemplates().map((t) => t.category))
    expect(cats.has('角色')).toBe(true)
    expect(cats.has('道具')).toBe(true)
    expect(cats.has('地形')).toBe(true)
    expect(cats.has('特效')).toBe(true)
  })
})

describe('getSpriteTemplate', () => {
  it('按 id 查找', () => {
    expect(getSpriteTemplate('sword').name).toBe('剑')
  })
  it('未知 id 中文报错', () => {
    expect(() => getSpriteTemplate('dragon')).toThrow('未知精灵模板')
  })
})

describe('renderSpriteTemplate', () => {
  it('默认配色渲染完整 SVG', () => {
    const svg = renderSpriteTemplate('coin')
    expect(svg).toContain('<svg')
    expect(svg).toContain('viewBox="0 0 64 64"')
    expect(svg).toContain('#fbbf24')
    expect(svg).toContain('</svg>')
  })
  it('自定义配色替换', () => {
    const svg = renderSpriteTemplate('slime', { primary: '#ff0000', secondary: '#00ff00' })
    expect(svg).toContain('#ff0000')
    expect(svg).toContain('#00ff00')
    expect(svg).not.toContain('#4ade80')
  })
  it('只覆盖主色时副色用默认', () => {
    const svg = renderSpriteTemplate('slime', { primary: '#123456' })
    expect(svg).toContain('#123456')
    expect(svg).toContain('#166534')
  })
  it('非法主色报错', () => {
    expect(() => renderSpriteTemplate('coin', { primary: 'red' })).toThrow('主色')
  })
  it('非法副色报错', () => {
    expect(() => renderSpriteTemplate('coin', { secondary: '#zzz' })).toThrow('副色')
  })
  it('未知 id 报错', () => {
    expect(() => renderSpriteTemplate('nope')).toThrow('未知精灵模板')
  })
  it('全部模板均可渲染', () => {
    for (const t of SPRITE_TEMPLATES) {
      const svg = renderSpriteTemplate(t.id)
      expect(svg.startsWith('<svg')).toBe(true)
      expect(svg.endsWith('</svg>')).toBe(true)
    }
  })
})

describe('renderAllSprites', () => {
  it('批量渲染 8 个', () => {
    const all = renderAllSprites()
    expect(all).toHaveLength(8)
    expect(all[0].id).toBe('slime')
    expect(all.every((x) => x.svg.includes('<svg'))).toBe(true)
  })
  it('批量渲染支持统一配色覆盖', () => {
    const all = renderAllSprites({ primary: '#abcdef' })
    expect(all.every((x) => x.svg.includes('#abcdef'))).toBe(true)
  })
})
