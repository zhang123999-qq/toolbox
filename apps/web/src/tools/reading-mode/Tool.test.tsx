// @vitest-environment jsdom
/**
 * reading-mode 组件测试（#739）：HTML 正文提取与阅读视图。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const SAMPLE_HTML = `<html><head><title>忽略我</title></head><body>
<nav><p>导航栏文字</p></nav>
<article><h1>测试标题</h1><p>第一段正文内容，用于测试阅读模式提取。</p><p>第二段正文内容，同样用于测试。</p></article>
</body></html>`

describe('reading-mode · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['font-size', 'line-height', 'theme', 'article-empty']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入 HTML 后渲染阅读视图与统计', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: SAMPLE_HTML } })
    expect(byTestId('article-title').textContent).toBe('测试标题')
    const view = byTestId('article-view').textContent ?? ''
    expect(view).toContain('第一段正文内容')
    expect(view).not.toContain('导航栏文字')
    expect(byTestId('article-stats').textContent).toContain('字')
  })

  it('无有效正文显示提取错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<body><div></div></body>' } })
    expect(byTestId('extract-error').textContent).toContain('未能提取到正文')
    expect(screen.queryByTestId('article-view')).toBeNull()
  })

  it('切换深色主题改变阅读视图样式', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: SAMPLE_HTML } })
    fireEvent.change(byTestId('theme'), { target: { value: 'dark' } })
    const style = byTestId('article-view').getAttribute('style') ?? ''
    expect(style).toContain('background-color: rgb(15, 23, 42)')
  })

  it('非法字号显示参数错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('font-size'), { target: { value: '8' } })
    expect(byTestId('param-error').textContent).toContain('阅读字号超出范围')
  })

  it('点示例填入示例 HTML', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('article-title').textContent).toBe('为什么需要阅读模式')
  })
})
