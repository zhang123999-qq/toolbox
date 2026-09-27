// @vitest-environment jsdom
/**
 * receipt 组件测试
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { toPng } from 'html-to-image'
import Tool from './Tool'

vi.mock('html-to-image', () => ({ toPng: vi.fn() }))

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('receipt · Tool', () => {
  it('渲染后 7 个必需 data-testid + 附加字段输入框 + 支付方式选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['input-payer', 'input-payee', 'input-amount', 'input-date', 'input-number']) {
      expect(byTestId(id)).toBeTruthy()
    }
    // 支付方式为 select 选项（模板未给 select 加 testid，用 label 定位）
    expect(screen.getByLabelText('支付方式')).toBeTruthy()
  })

  it('点示例后预览出现金额与导出按钮', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const preview = byTestId('receipt-preview')
    expect(preview.textContent).toContain('3,500.00')
    expect(preview.textContent).toContain('张三')
    expect(byTestId('export-png')).toBeTruthy()
  })

  it('点清空回到空态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input-amount') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).toContain('填写左侧表单')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('金额非法进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-amount'), { target: { value: 'abc' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('金额无效')
  })

  it('金额为负进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-amount'), { target: { value: '-50' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('金额不能为负数')
  })

  it('HTML 特殊字符被转义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-payer'), { target: { value: '<b>黑客</b>' } })
    fireEvent.change(byTestId('input-amount'), { target: { value: '100' } })
    const html = byTestId('receipt-preview').innerHTML
    expect(html).not.toContain('<b>')
    expect(html).toContain('&lt;b&gt;')
  })

  it('导出 PNG 成功时调用 toPng', async () => {
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,xxx')
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-png'))
    await waitFor(() => expect(vi.mocked(toPng)).toHaveBeenCalled())
    expect(screen.queryByTestId('export-error')).toBeNull()
  })

  it('导出 PNG 失败时显示降级提示', async () => {
    vi.mocked(toPng).mockRejectedValue(new Error('tainted'))
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-png'))
    const alert = await screen.findByTestId('export-error')
    expect(alert.textContent).toContain('导出失败')
  })
})
