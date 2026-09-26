// @vitest-environment jsdom
/**
 * code-minify 组件测试
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

describe('code-minify · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出压缩后的 JS（不含注释与换行）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).not.toContain('两行数之和')
    expect(output).not.toContain('模块结束')
    expect(output).toContain('function add(a, b)')
  })

  it('切到 css 语言后压缩 CSS', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('语言'), { target: { value: 'css' } })
    fireEvent.change(byTestId('input'), { target: { value: '/* c */.a{color:red;}' } })
    expect(byTestId('output').textContent).not.toContain('c */')
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
