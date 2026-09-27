// @vitest-environment jsdom
/**
 * resume 组件测试
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

describe('resume · Tool', () => {
  it('渲染后 7 个必需 data-testid + 附加字段输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of [
      'input-title',
      'input-phone',
      'input-email',
      'input-summary',
      'input-experience',
      'input-education',
      'input-skills',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例后预览区出现姓名与导出按钮', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('resume-preview').textContent).toContain('陈静')
    expect(byTestId('resume-preview').textContent).toContain('高级前端工程师')
    expect(byTestId('export-png')).toBeTruthy()
  })

  it('点清空回到空态（无错误、无导出按钮）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(byTestId('output').textContent).toContain('填写左侧表单')
    expect(screen.queryByTestId('export-png')).toBeNull()
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(within(byTestId('output')).queryByRole('alert')).toBeNull()
  })

  it('只填职位不填姓名进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input-title'), { target: { value: '工程师' } })
    const alert = within(byTestId('output')).getByRole('alert')
    expect(alert.textContent).toContain('请填写姓名')
  })

  it('HTML 特殊字符被转义，不破坏预览布局', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '<img src=x onerror=alert(1)>' } })
    const html = byTestId('resume-preview').innerHTML
    expect(html).not.toContain('<img')
    expect(html).toContain('&lt;img')
  })

  it('导出 PNG 成功时调用 toPng', async () => {
    vi.mocked(toPng).mockResolvedValue('data:image/png;base64,xxx')
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-png'))
    await waitFor(() => expect(vi.mocked(toPng)).toHaveBeenCalled())
    expect(vi.mocked(toPng).mock.calls[0][1]).toMatchObject({ pixelRatio: 2 })
    expect(screen.queryByTestId('export-error')).toBeNull()
  })

  it('导出 PNG 失败时显示双语降级提示', async () => {
    vi.mocked(toPng).mockRejectedValue(new Error('canvas tainted'))
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('export-png'))
    const alert = await screen.findByTestId('export-error')
    expect(alert.textContent).toContain('导出失败')
    expect(alert.getAttribute('role')).toBe('alert')
  })
})
