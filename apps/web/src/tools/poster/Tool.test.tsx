// @vitest-environment jsdom
/**
 * poster 组件测试
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

describe('poster · Tool', () => {
  it('渲染后 7 个必需 data-testid + 附加字段输入框 + 主题选项存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['input-title', 'input-subtitle', 'input-footer']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('主题')).toBeTruthy()
  })

  it('点示例后预览出现标题与导出按钮', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const preview = byTestId('poster-preview')
    expect(preview.textContent).toContain('金秋大促')
    expect(byTestId('export-png')).toBeTruthy()
  })

  it('点清空回到空态', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input-title') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).toContain('填写左侧表单')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('HTML 特殊字符被转义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-title'), { target: { value: '<script>alert(1)</script>' } })
    const html = byTestId('poster-preview').innerHTML
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('切换主题后预览背景变化', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('主题'), { target: { value: '深蓝' } })
    const style = (byTestId('poster-preview') as HTMLElement).style.background
    expect(style).toContain('linear-gradient')
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
