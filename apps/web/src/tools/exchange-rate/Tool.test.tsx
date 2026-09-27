// @vitest-environment jsdom
/**
 * exchange-rate 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('exchange-rate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('API Key 输入框为 password 类型（不明文展示）', () => {
    render(<Tool />)
    expect(byTestId('input-apiKey').getAttribute('type')).toBe('password')
  })

  it('点击「示例」后填入金额，但不自动发请求', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('100')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('没填 Key 就点运行，给出明确的缺 Key 提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('请先填写 API Key'))
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切换目标货币后选项生效', () => {
    const { container } = render(<Tool />)
    const [, to] = Array.from(container.querySelectorAll('select'))
    fireEvent.change(to as HTMLSelectElement, { target: { value: 'EUR' } })
    expect((to as HTMLSelectElement).value).toBe('EUR')
  })
})
