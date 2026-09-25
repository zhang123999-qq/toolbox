// @vitest-environment jsdom
/**
 * mime-encode 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('mime-encode · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出为 encoded-word', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('=?UTF-8?B?5bel5YW35bqT?=')
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

  it('切到 Q 模式后按 quoted-printable 变体编码', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'Q' } })
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('=?UTF-8?Q?=E5=B7=A5=E5=85=B7=E5=BA=93?=')
  })

  it('切到解码方向后能还原文本', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input'), { target: { value: '=?UTF-8?B?5bel5YW35bqT?=' } })
    expect(byTestId('output').textContent).toBe('工具库')
  })

  it('非法输入进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input'), { target: { value: '=?UTF-8?B?@@@?=' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
