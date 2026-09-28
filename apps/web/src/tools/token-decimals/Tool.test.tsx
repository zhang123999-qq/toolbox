// @vitest-environment jsdom
/**
 * token-decimals 组件测试：单位换算与自定义 decimals。
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

describe('token-decimals · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('源单位')).toBeTruthy()
    expect(screen.getByLabelText('目标单位')).toBeTruthy()
  })

  it('点示例 1 ether → wei', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('1000000000000000000')
  })

  it('切换 gwei → ether 换算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1000000000' } })
    fireEvent.change(screen.getByLabelText('源单位'), { target: { value: 'gwei' } })
    fireEvent.change(screen.getByLabelText('目标单位'), { target: { value: 'ether' } })
    expect(byTestId('output').textContent).toContain('结果：1（ether）')
  })

  it('自定义 decimals 换算', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '1' } })
    fireEvent.change(screen.getByLabelText('源单位'), { target: { value: '自定义' } })
    fireEvent.change(screen.getByLabelText('源自定义 decimals'), { target: { value: '6' } })
    fireEvent.change(screen.getByLabelText('目标单位'), { target: { value: '自定义' } })
    fireEvent.change(screen.getByLabelText('目标自定义 decimals'), { target: { value: '6' } })
    expect(byTestId('output').textContent).toContain('结果：1（6 decimals）')
  })

  it('非法输入行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').textContent).toContain('格式错误')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
