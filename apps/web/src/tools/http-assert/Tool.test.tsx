// @vitest-environment jsdom
/**
 * http-assert 组件测试（#743→#748）：断言规则编辑与执行报告（fetch 全 mock）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubFetch(ok: boolean): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      status: ok ? 200 : 500,
      headers: { 'content-type': 'application/json' },
      text: async () => '{"ok":true}',
    })),
  )
}

describe('http-assert · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['method', 'headers', 'body', 'assertions', 'assert-run']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('执行成功显示通过报告', async () => {
    stubFetch(true)
    render(<Tool />)
    fireEvent.click(byTestId('assert-run'))
    const report = await screen.findByTestId('assert-report')
    expect(report.textContent).toContain('测试通过')
    expect(report.textContent).toContain('4/4')
  })

  it('断言失败显示未通过', async () => {
    stubFetch(false)
    render(<Tool />)
    fireEvent.click(byTestId('assert-run'))
    const report = await screen.findByTestId('assert-report')
    expect(report.textContent).toContain('测试未通过')
  })

  it('非法断言 JSON 显示中文错误', async () => {
    stubFetch(true)
    render(<Tool />)
    fireEvent.change(byTestId('assertions'), { target: { value: '{bad' } })
    fireEvent.click(byTestId('assert-run'))
    const err = await screen.findByTestId('assert-error')
    expect(err.textContent).toContain('不是合法 JSON')
  })

  it('非法 URL 显示中文错误', async () => {
    stubFetch(true)
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-url' } })
    fireEvent.click(byTestId('assert-run'))
    const err = await screen.findByTestId('assert-error')
    expect(err.textContent).toContain('必须以 http:// 或 https:// 开头')
  })

  it('网络错误显示 CORS 中文提示', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new TypeError('Failed to fetch')
      }),
    )
    render(<Tool />)
    fireEvent.click(byTestId('assert-run'))
    const report = await screen.findByTestId('assert-report')
    expect(report.textContent).toContain('CORS')
  })
})
