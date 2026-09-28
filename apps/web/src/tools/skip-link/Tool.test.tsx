// @vitest-environment jsdom
/**
 * skip-link 组件测试（#734）：参数实时生成代码，粘贴 HTML 实时检测。
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

describe('skip-link · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['target-id', 'link-label', 'snippet-html', 'snippet-css', 'demo-skip-link']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成标准代码', () => {
    render(<Tool />)
    expect(byTestId('snippet-html').textContent).toBe(
      '<a class="skip-link" href="#main-content">跳转到主要内容</a>',
    )
    expect(byTestId('snippet-css').textContent).toContain('.skip-link:focus')
  })

  it('修改参数实时更新代码', () => {
    render(<Tool />)
    fireEvent.change(byTestId('target-id'), { target: { value: 'content' } })
    fireEvent.change(byTestId('link-label'), { target: { value: '跳到正文' } })
    expect(byTestId('snippet-html').textContent).toContain('href="#content"')
    expect(byTestId('snippet-html').textContent).toContain('跳到正文')
  })

  it('非法 target-id 显示参数错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('target-id'), { target: { value: '1abc' } })
    expect(byTestId('param-error').textContent).toContain('不合法')
    expect(screen.queryByTestId('snippet-html')).toBeNull()
  })

  it('粘贴含跳过链接的 HTML 显示检测结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<a class="skip-link" href="#m">跳过导航</a><main id="m">x</main>' },
    })
    const d = byTestId('detect-result').textContent ?? ''
    expect(d).toContain('检测到跳过链接')
    expect(d).toContain('目标存在')
  })

  it('粘贴无跳过链接的 HTML 提示添加', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<p>正文</p>' } })
    expect(byTestId('detect-result').textContent).toContain('未检测到跳过链接')
  })

  it('点示例填入并检出示例链接', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('detect-result').textContent).toContain('检测到跳过链接')
  })
})
