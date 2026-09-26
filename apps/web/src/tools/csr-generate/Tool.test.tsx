// @vitest-environment jsdom
/**
 * csr-generate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

describe('csr-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 输出 CSR PEM', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(
      () => expect(byTestId('output').textContent).toContain('BEGIN CERTIFICATE REQUEST'),
      { timeout: 30000 },
    )
  }, 30000)

  it('勾选同时输出私钥后结果含 RSA PRIVATE KEY', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByLabelText('同时输出私钥'))
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('BEGIN RSA PRIVATE KEY'), {
      timeout: 30000,
    })
  }, 30000)

  it('通用名为空时输出区转为 role=alert', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('通用名（CN）'), { target: { value: '' } })
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'), {
      timeout: 10000,
    })
  }, 15000)

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
