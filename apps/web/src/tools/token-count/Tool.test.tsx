// @vitest-environment jsdom
/**
 * token-count 组件测试：动态导入的 gpt-tokenizer 用 vi.mock 拦截，
 * 不加载真实词表；另覆盖导入失败的中文提示分支。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

vi.mock('gpt-tokenizer', () => ({
  encode: (t: string): number[] => t.split('').map((_, i) => i),
}))

vi.mock('gpt-tokenizer/encoding/cl100k_base', () => ({
  encode: (t: string): number[] => t.split(' ').map((_, i) => i),
}))

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('token-count · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('o200k 分词器统计（mock 按字符切分）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'hello' } })
    fireEvent.click(byTestId('count'))
    await waitFor(() => expect(byTestId('token-result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('token-result').textContent).toBe('共 5 个 token')
  })

  it('切换 cl100k 分词器（mock 按空格切分）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a b c' } })
    fireEvent.change(screen.getByRole('combobox', { name: '分词器' }), {
      target: { value: 'cl100k' },
    })
    fireEvent.click(byTestId('count'))
    await waitFor(() => expect(byTestId('token-result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('token-result').textContent).toBe('共 3 个 token')
  })

  it('空文本 → 0 个 token', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('count'))
    await waitFor(() => expect(byTestId('token-result')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('token-result').textContent).toBe('共 0 个 token')
  })

  it('分词器加载失败 → 中文友好提示', async () => {
    vi.resetModules()
    vi.doMock('gpt-tokenizer', () => {
      throw new Error('Failed to fetch dynamically imported module')
    })
    const { default: ToolReloaded } = await import('./Tool')
    render(<ToolReloaded />)
    fireEvent.change(screen.getByTestId('input'), { target: { value: 'hello' } })
    fireEvent.click(screen.getByTestId('count'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(screen.getByTestId('error').textContent).toContain('分词器加载失败')
    vi.doUnmock('gpt-tokenizer')
  })
})
