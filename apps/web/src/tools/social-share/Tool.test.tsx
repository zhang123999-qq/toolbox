// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

function inputEl(id: string): HTMLInputElement {
  return byTestId(id) as HTMLInputElement
}

const PLATFORM_NAMES = [
  'X',
  'Facebook',
  'LinkedIn',
  '微博',
  'Telegram',
  'WhatsApp',
  'Reddit',
  '邮件',
]

/** 给 jsdom 补一个可 mock 的 navigator.clipboard */
function mockClipboard(): ReturnType<typeof vi.fn> {
  const writeText = vi.fn().mockResolvedValue(undefined)
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

function restoreClipboard(): void {
  delete (window.navigator as unknown as { clipboard?: unknown }).clipboard
}

describe('social-share · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例填入 URL 与标题', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(inputEl('input').value).toBe('https://example.com/article')
    expect(inputEl('option-shareTitle').value).toBe('示例文章标题')
  })

  it('示例 → 运行后输出含 8 个平台名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    const text = byTestId('output').textContent ?? ''
    for (const name of PLATFORM_NAMES) {
      expect(text).toContain(name)
    }
    expect(text).toContain('twitter.com/intent/tweet')
  })

  it('非法 URL 点运行进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-url' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(byTestId('output').textContent).toContain('http')
  })

  it('点清空回到空输入并清空输出', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toContain('twitter.com')
    fireEvent.click(byTestId('clear'))
    expect(inputEl('input').value).toBe('')
    expect(inputEl('option-shareTitle').value).toBe('')
    expect(byTestId('output').textContent).not.toContain('twitter.com')
  })

  it('单个平台复制按钮调用 clipboard', async () => {
    const writeText = mockClipboard()
    try {
      render(<Tool />)
      fireEvent.click(byTestId('example'))
      fireEvent.click(byTestId('run'))
      fireEvent.click(byTestId('copy-x'))
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledWith(expect.stringContaining('twitter.com/intent/tweet'))
      })
    } finally {
      restoreClipboard()
    }
  })

  it('复制全部按钮一次复制 8 条链接文本', async () => {
    const writeText = mockClipboard()
    try {
      render(<Tool />)
      fireEvent.click(byTestId('example'))
      fireEvent.click(byTestId('run'))
      fireEvent.click(byTestId('copy'))
      await waitFor(() => {
        expect(writeText).toHaveBeenCalledTimes(1)
      })
      const arg = writeText.mock.calls[0]?.[0] as string
      expect(arg.split('\n')).toHaveLength(8)
    } finally {
      restoreClipboard()
    }
  })
})
