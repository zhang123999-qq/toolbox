// @vitest-environment jsdom
/**
 * title-gen 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('title-gen · Tool', () => {
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
    // 未点运行前不应有结果，也不应进入错误态
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    expect(byTestId('output').textContent).not.toContain('请先填写')
  })

  it('没填接口信息就点运行，给出明确的缺项提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
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

  it('改候选数量为 5 后指令带上 5（仍会因缺接口信息而提示）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const selects = document.querySelectorAll('select')
    // 选项顺序：style、count
    fireEvent.change(selects[1] as HTMLSelectElement, { target: { value: '5' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toContain('请先填写'))
  })
})
