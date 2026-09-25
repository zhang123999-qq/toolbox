// @vitest-environment jsdom
/**
 * md5-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('md5-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后立即得到 MD5 摘要（同步工具随输入重算）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('900150983cd24fb0d6963f7d28e17f72')
  })

  it('点「运行」后输出保持为同一摘要', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').textContent).toBe('900150983cd24fb0d6963f7d28e17f72')
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

  it('勾选「大写输出」后输出全大写', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(screen.getByRole('checkbox'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toBe('900150983CD24FB0D6963F7D28E17F72')
    expect(out).toBe(out.toUpperCase())
  })

  it('切到 base64 格式后输出以 == 结尾', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toBe('kAFQmDzST7DWlj99KOF/cg==')
  })

  it('非法输入（超过上限）进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a'.repeat(200001) } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
