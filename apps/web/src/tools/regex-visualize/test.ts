import { describe, expect, it } from 'vitest'
import { transform, visualize } from './utils'

describe('regex-visualize / visualize', () => {
  it('字面量生成含 svg/rect/text 的标记', () => {
    const svg = visualize('abc')
    expect(svg).toContain('<svg')
    expect(svg).toContain('</svg>')
    expect(svg).toContain('<rect')
    expect(svg).toContain('>a<')
    expect(svg).toContain('>b<')
    expect(svg).toContain('>c<')
  })

  it('量词生成蓝色回环路径', () => {
    const svg = visualize('a+')
    expect(svg).toContain('<path')
    expect(svg).toContain('>+<')
  })

  it('选择生成左右两条垂直母线（alt 分支）', () => {
    const svg = visualize('a|b')
    // 两个分支各有一个字面量盒
    expect((svg.match(/<text[^>]*>/g) ?? []).length).toBeGreaterThanOrEqual(2)
    expect(svg).toContain('>a<')
    expect(svg).toContain('>b<')
  })

  it('字符类用黄色填充盒', () => {
    const svg = visualize('[0-9]')
    expect(svg).toContain('#fde68a')
    expect(svg).toContain('[0-9]')
  })

  it('分组可解析且不报错', () => {
    expect(() => visualize('(ab)+c')).not.toThrow()
    expect(visualize('(ab)+c')).toContain('>c<')
  })

  it('锚点单独成盒', () => {
    expect(visualize('^a$')).toContain('#c7d2fe')
  })
})

describe('regex-visualize / transform', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, {})).toBe('')
  })

  it('非法正则抛中文错误', () => {
    expect(() => transform({ text: '(' }, {})).toThrow(/正则解析失败|缺少/)
    expect(() => transform({ text: '(?x)' }, {})).toThrow(/不支持/)
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'a'.repeat(200001) }, {})).toThrow(/上限/)
  })

  it('示例输入产出完整 SVG', () => {
    const out = transform({ text: '(https?://)?[\\w.-]+(:\\d+)?' }, {})
    expect(out.startsWith('<svg')).toBe(true)
    expect(out).toContain('start')
    expect(out).toContain('end')
  })
})
