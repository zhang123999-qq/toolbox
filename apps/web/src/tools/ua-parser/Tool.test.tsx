// @vitest-environment jsdom
/**
 * ua-parser 组件测试
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

describe('ua-parser · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后识别出 Chrome 与 Windows', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('浏览器：Chrome')
    expect(output).toContain('Windows 10/11')
  })

  it('粘贴 iPhone UA 识别为手机', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1',
      },
    })
    expect(byTestId('output').textContent).toContain('设备类型：手机')
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

  it('任意非空输入不报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'curl/8.0' } })
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
