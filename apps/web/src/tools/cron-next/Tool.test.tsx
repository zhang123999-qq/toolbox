// @vitest-environment jsdom
/**
 * cron-next 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('cron-next · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出带序号的下次时间列表', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toMatch(/^1\. \d{4}-\d{2}-\d{2}/)
    expect(output).toContain('02:00')
  })

  it('把次数改成 3 后列出 3 次', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-count'), { target: { value: '3' } })
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('3. ')
    expect(output).not.toContain('4. ')
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

  it('非法 cron 表达式进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '0 2 *' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
