import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('html-to-markdown / transform', () => {
  it('标题转 ATX 形式', () => {
    expect(transform({ text: '<h2>工具库</h2>' })).toBe('## 工具库')
  })

  it('强调转换', () => {
    expect(transform({ text: '<p>本地<strong>优先</strong>和<em>870</em></p>' })).toContain(
      '**优先**',
    )
    expect(transform({ text: '<p>本地<em>优先</em></p>' })).toContain('*优先*')
  })

  it('无序列表用 - 作为项目符号', () => {
    // turndown 的列表缩进是「短横线 + 3 空格」，故用正则而不是整串比对
    expect(transform({ text: '<ul><li>a</li><li>b</li></ul>' })).toMatch(/^-\s+a/m)
  })

  it('链接转为 Markdown 语法', () => {
    expect(transform({ text: '<a href="https://a.test">A</a>' })).toBe('[A](https://a.test)')
  })

  it('纯文本原样输出', () => {
    expect(transform({ text: 'abc' })).toBe('abc')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: ' <br> ' })).toBe('')
  })
})
