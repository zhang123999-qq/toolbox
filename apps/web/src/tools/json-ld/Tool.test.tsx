// @vitest-environment jsdom
/**
 * json-ld 组件测试（#625）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('json-ld · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['type-select', 'input', 'run', 'example', 'clear']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出 Article 的 JSON-LD', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('<script type="application/ld+json">')
    expect(text).toContain('"@type": "Article"')
    expect(text).toContain('如何做好 SEO')
    expect(byTestId('copy')).toBeTruthy()
    expect(byTestId('download')).toBeTruthy()
  })

  it('标题为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('Article 的 headline（标题）不能为空')
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('切换到 FAQPage 后字段与校验跟随类型', () => {
    render(<Tool />)
    fireEvent.change(byTestId('type-select'), { target: { value: 'FAQPage' } })
    expect(byTestId('field-questions')).toBeTruthy()
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('"@type": "FAQPage"')
    expect(text).toContain('支持7天无理由退货')
  })

  it('FAQPage 无问答时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('type-select'), { target: { value: 'FAQPage' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('FAQPage 至少需要 1 条问答')
  })

  it('切换到 Product 后示例输出商品结构化数据', () => {
    render(<Tool />)
    fireEvent.change(byTestId('type-select'), { target: { value: 'Product' } })
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('"@type": "Product"')
  })

  it('点击「清空」后字段与输出清空', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('field-headline') as HTMLInputElement).value).toBe('')
    expect(screen.queryByTestId('output')).toBeNull()
  })
})
