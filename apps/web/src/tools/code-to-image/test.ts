import { describe, expect, it } from 'vitest'
import { splitLines, tokenizeLine, transform } from './utils'
import type { CodeToImageOptions } from './schema'

const base: CodeToImageOptions = { theme: 'dark', language: 'js', fontSize: '14' }

describe('code-to-image / splitLines', () => {
  it('按 \n 切分，兼容 \\r\\n', () => {
    expect(splitLines('a\nb\r\nc')).toEqual(['a', 'b', 'c'])
  })

  it('空字符串得到一个空行', () => {
    expect(splitLines('')).toEqual([''])
  })
})

describe('code-to-image / tokenizeLine', () => {
  it('识别 JS 关键字', () => {
    const tokens = tokenizeLine('const x = 1', 'js')
    expect(tokens[0]).toEqual({ text: 'const', kind: 'keyword' })
  })

  it('识别字符串', () => {
    const tokens = tokenizeLine('const s = "hi"', 'js')
    expect(tokens.some((t) => t.kind === 'string' && t.text === '"hi"')).toBe(true)
  })

  it('识别数字', () => {
    const tokens = tokenizeLine('const x = 42', 'js')
    expect(tokens.some((t) => t.kind === 'number' && t.text === '42')).toBe(true)
  })

  it('行注释整段标记为 comment', () => {
    const tokens = tokenizeLine('const x = 1 // note', 'js')
    expect(tokens[tokens.length - 1]).toEqual({ text: '// note', kind: 'comment' })
  })

  it('html 标签行整体标记为 keyword', () => {
    expect(tokenizeLine('<div>hi</div>', 'html')[0].kind).toBe('keyword')
  })

  it('plain 语言不做高亮', () => {
    expect(tokenizeLine('const x = 1', 'plain')).toEqual([{ text: 'const x = 1', kind: 'plain' }])
  })
})

describe('code-to-image / transform（边界）', () => {
  it('空输入返回空串', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })

  it('超长输入抛错（在调 canvas 之前）', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, base)).toThrow(/上限/)
  })
})
