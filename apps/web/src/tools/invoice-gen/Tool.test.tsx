// @vitest-environment jsdom
/**
 * invoice-gen 组件测试
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

describe('invoice-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid + 附加字段输入框存在', () => {
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
  })

  it('点示例后预览出现发票号与总计', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const preview = byTestId('invoice-preview')
    expect(preview.textContent).toContain('INV-2026-0001')
    expect(preview.textContent).toContain('11,236.00')
    expect(byTestId('export-png')).toBeTruthy()
  })

  it('点清空回到空态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).toContain('填写左侧表单')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('明细格式错误进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '只有名称' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('第 1 行格式错误')
  })

  it('单价为负进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '设计费,2,-5' } })
    expect(within(byTestId('output')).getByRole('alert').textContent).toContain('不能为负')
  })

  it('HTML 特殊字符被转义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-seller'), { target: { value: '<script>alert(1)</script>' } })
    fireEvent.change(byTestId('input'), { target: { value: '设计费,1,100' } })
    const html = byTestId('invoice-preview').innerHTML
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
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
