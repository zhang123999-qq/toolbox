// @vitest-environment jsdom
/**
 * clipboard-test 组件测试（#864）：navigator.clipboard 全 mock。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function stubClipboard(ok: boolean): void {
  const store = { text: '' }
  Object.defineProperty(window.navigator, 'clipboard', {
    value: ok
      ? {
          writeText: vi.fn(async (t: string) => {
            store.text = t
          }),
          readText: vi.fn(async () => store.text),
        }
      : undefined,
    configurable: true,
  })
}

describe('clipboard-test · Tool', () => {
  it('往返校验一致时展示成功', async () => {
    stubClipboard(true)
    render(<Tool />)
    fireEvent.click(byTestId('clipboard-roundtrip'))
    await waitFor(() => {
      expect(byTestId('clipboard-result').textContent).toContain('往返一致')
    })
  })

  it('读取后展示读回内容', async () => {
    stubClipboard(true)
    render(<Tool />)
    fireEvent.change(byTestId('clipboard-input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('clipboard-write'))
    await waitFor(() => {
      expect(byTestId('clipboard-result').textContent).toContain('写入成功')
    })
    fireEvent.click(byTestId('clipboard-read'))
    await waitFor(() => {
      expect(byTestId('clipboard-result').textContent).toContain('读回：abc')
    })
  })

  it('API 缺失时展示中文提示', async () => {
    stubClipboard(false)
    render(<Tool />)
    fireEvent.click(byTestId('clipboard-write'))
    await waitFor(() => {
      expect(byTestId('clipboard-error').textContent).toContain('不支持 Clipboard API')
    })
  })
})
