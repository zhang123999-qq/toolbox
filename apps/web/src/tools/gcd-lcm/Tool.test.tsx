// @vitest-environment jsdom
/**
 * gcd-lcm 组件测试
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

describe('gcd-lcm · Tool', () => {
  it('渲染后 7 个必需 data-testid + 第二个数输入框存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('input-textB')).toBeTruthy()
  })

  it('点示例后输出 GCD=6、LCM=36', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('最大公约数（GCD）：6')
    expect(output).toContain('最小公倍数（LCM）：36')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((byTestId('input-textB') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('手动输入两个整数即时重算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '100' } })
    fireEvent.change(byTestId('input-textB'), { target: { value: '80' } })
    expect(byTestId('output').textContent).toContain('最大公约数（GCD）：20')
    expect(byTestId('output').textContent).toContain('最小公倍数（LCM）：400')
  })

  it('输入小数进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '12.5' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
