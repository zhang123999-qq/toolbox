// @vitest-environment jsdom
/**
 * code-to-pdf 组件测试
 *
 * 覆盖：必需 testid、示例→生成→页数信息、行号开关、中文错误态、清空。
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function stubDownloads(): void {
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:mock', configurable: true })
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => undefined, configurable: true })
}

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('code-to-pdf · Tool', () => {
  beforeEach(stubDownloads)

  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('export-pdf')).toBeTruthy()
  })

  it('示例 → 生成并下载 PDF → 显示页数信息', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('pdf-info').textContent).toMatch(/1 页/), {
      timeout: 10000,
    })
  })

  it('行号开关可切换', () => {
    render(<Tool />)
    const checkbox = screen.getByLabelText('显示行号') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
    fireEvent.click(checkbox)
    expect(checkbox.checked).toBe(false)
  })

  it('中文输入给出中文错误（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '// 中文注释' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('export-error').textContent).toContain('暂不支持中文字符')
    expect(byTestId('export-error').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
