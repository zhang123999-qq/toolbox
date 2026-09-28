// @vitest-environment jsdom
/**
 * hreflang 组件测试（#627）
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

describe('hreflang · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'add', 'lang-0', 'url-0']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」输出 hreflang 标签组', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(text).toContain('<link rel="alternate" hreflang="en" href="https://example.com/en/">')
    expect(text).toContain('<link rel="alternate" hreflang="zh-CN" href="https://example.com/zh/">')
    expect(byTestId('copy')).toBeTruthy()
    expect(byTestId('download')).toBeTruthy()
  })

  it('URL 为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('第 1 条：URL 不能为空')
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('「添加一条」后第二条可独立填写并生成', () => {
    render(<Tool />)
    fireEvent.change(byTestId('url-0'), { target: { value: 'https://example.com/en/' } })
    fireEvent.click(byTestId('add'))
    fireEvent.change(byTestId('lang-1'), { target: { value: 'ja' } })
    fireEvent.change(byTestId('url-1'), { target: { value: 'https://example.com/ja/' } })
    fireEvent.click(byTestId('run'))
    const text = byTestId('output').textContent ?? ''
    expect(text).toContain('hreflang="en"')
    expect(text).toContain('hreflang="ja"')
  })

  it('删除后条目减少', () => {
    render(<Tool />)
    fireEvent.click(byTestId('add'))
    expect(byTestId('url-1')).toBeTruthy()
    fireEvent.click(byTestId('remove-1'))
    expect(screen.queryByTestId('url-1')).toBeNull()
  })

  it('全部删除后生成提示至少需要 1 条', () => {
    render(<Tool />)
    fireEvent.click(byTestId('remove-0'))
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('至少需要 1 条语言-地区对')
  })

  it('点击「清空」回到单条空行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('url-0') as HTMLInputElement).value).toBe('')
    expect(screen.queryByTestId('output')).toBeNull()
  })
})
