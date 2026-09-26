import { describe, expect, it } from 'vitest'
import { countLines, render, transform } from './utils'

describe('cloc / countLines', () => {
  it('c-style 区分代码 / // / /* */ / 空行', () => {
    const src = [
      '// comment',
      'const a = 1',
      '',
      '/* block',
      '   continued */',
      'const b = 2',
    ].join('\n')
    const c = countLines(src, 'c-style')
    expect(c.blank).toBe(1)
    expect(c.comment).toBe(3) // // + block 两行
    expect(c.code).toBe(2)
    expect(c.total).toBe(6)
  })

  it('python 认 # 注释', () => {
    const c = countLines('# header\nx = 1\n\ny = 2', 'python')
    expect(c.comment).toBe(1)
    expect(c.code).toBe(2)
    expect(c.blank).toBe(1)
  })

  it('shell 认 # 与 --', () => {
    const c = countLines('# x\necho ok\n-- sql style', 'shell')
    expect(c.comment).toBe(2)
    expect(c.code).toBe(1)
  })
})

describe('cloc / render & transform', () => {
  it('render 输出四项与占比', () => {
    const out = render(countLines('a\nb\n# c', 'python'))
    expect(out).toContain('代码行：2')
    expect(out).toContain('注释行：1')
    expect(out).toContain('注释占比')
  })

  it('空输入返回空串', () => {
    expect(transform({ text: '' }, { language: 'c-style' })).toBe('')
  })

  it('超长输入报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, { language: 'c-style' })).toThrow(/上限/)
  })
})
