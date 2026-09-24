// @vitest-environment jsdom
/**
 * summarize 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('summarize · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入正文，但不自动发请求', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).not.toBe('')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('extractive 模式下点运行即得到本地摘要（不走接口）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('。'))
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('切到 abstractive 且没填接口信息时给出缺项提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 第一个下拉是 mode；extractive 是本地模式，不会碰到接口
    fireEvent.change(screen.getAllByRole('combobox')[0], {
      target: { value: 'abstractive' },
    })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('请先填写'))
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
})
