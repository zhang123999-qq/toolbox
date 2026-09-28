// @vitest-environment jsdom
/**
 * invoice-pdf 组件测试
 *
 * 覆盖：必需 testid、表单 testid、示例→生成→页数信息、明细格式错误态、中文错误态、清空。
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

describe('invoice-pdf · Tool', () => {
  beforeEach(stubDownloads)

  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'input-seller',
      'input-buyer',
      'input-number',
      'input-date',
      'input-taxRate',
      'input-notes',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('export-pdf')).toBeTruthy()
  })

  it('示例 → 生成并下载 PDF → 显示页数信息', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 示例填充了明细与表单
    expect((byTestId('input') as HTMLTextAreaElement).value).toContain('Website design')
    expect((byTestId('input-seller') as HTMLTextAreaElement).value).toBe('Acme Studio')
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('pdf-info').textContent).toMatch(/1 页/), {
      timeout: 10000,
    })
  })

  it('明细格式错误给出中文错误（role=alert）', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'only-name-no-numbers' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(() => expect(byTestId('export-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('export-error').textContent).toContain('第 1 行格式错误')
    expect(byTestId('export-error').getAttribute('role')).toBe('alert')
  })

  it('中文品名给出中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '网站设计,1,8000' } })
    fireEvent.click(byTestId('export-pdf'))
    await waitFor(
      () => expect(byTestId('export-error').textContent).toContain('暂不支持中文字符'),
      { timeout: 10000 },
    )
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-seller') as HTMLTextAreaElement).value).toBe('')
  })
})
