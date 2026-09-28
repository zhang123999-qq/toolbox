// @vitest-environment jsdom
/**
 * api-doc 组件测试（#756）：文档生成与错误展示（纯本地）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('api-doc · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['apidoc-title', 'apidoc-version', 'apidoc-generate']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认示例一键生成文档', () => {
    render(<Tool />)
    fireEvent.click(byTestId('apidoc-generate'))
    const result = byTestId('apidoc-result')
    expect(result.textContent).toContain('# 用户服务 API 文档')
    expect(result.textContent).toContain('获取用户信息')
    expect(result.textContent).toContain('创建用户')
  })

  it('标题版本参与文档', () => {
    render(<Tool />)
    fireEvent.change(byTestId('apidoc-title'), { target: { value: '订单服务' } })
    fireEvent.change(byTestId('apidoc-version'), { target: { value: 'v9' } })
    fireEvent.click(byTestId('apidoc-generate'))
    const result = byTestId('apidoc-result')
    expect(result.textContent).toContain('# 订单服务')
    expect(result.textContent).toContain('版本：v9')
  })

  it('非法 JSON 显示中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('apidoc-generate'))
    expect(byTestId('apidoc-error').textContent).toContain('不是合法 JSON')
  })

  it('缺名称显示带序号的中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '[{"name":"a","method":"GET","path":"/"}]' },
    })
    fireEvent.click(byTestId('apidoc-generate'))
    expect(byTestId('apidoc-result').textContent).toContain('## 1. a')
    fireEvent.change(byTestId('input'), {
      target: { value: '[{"name":"a","method":"GET","path":"/"},{"method":"GET","path":"/"}]' },
    })
    fireEvent.click(byTestId('apidoc-generate'))
    expect(byTestId('apidoc-error').textContent).toContain('第 2 个接口')
  })
})
