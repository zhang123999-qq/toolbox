// @vitest-environment jsdom
/**
 * level-editor 组件测试（#801）：关卡编辑。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('level-editor · Tool', () => {
  it('渲染后必需元素全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('level-add')).toBeTruthy()
    expect(byTestId('level-validate')).toBeTruthy()
  })

  it('添加对象后输出新 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[]' } })
    fireEvent.change(byTestId('level-id'), { target: { value: 'coin1' } })
    fireEvent.change(byTestId('level-x'), { target: { value: '20' } })
    fireEvent.change(byTestId('level-y'), { target: { value: '30' } })
    fireEvent.click(byTestId('level-add'))
    expect(byTestId('level-output').textContent).toContain('coin1')
  })

  it('重复 id 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '[{"id":"dup","type":"item","x":1,"y":1}]' },
    })
    fireEvent.change(byTestId('level-id'), { target: { value: 'dup' } })
    fireEvent.click(byTestId('level-add'))
    expect(byTestId('level-error').textContent).toContain('已存在')
  })

  it('校验合法关卡通过', () => {
    render(<Tool />)
    fireEvent.click(byTestId('level-validate'))
    expect(byTestId('level-output').textContent).toContain('校验通过')
  })

  it('校验发现缺少出口', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '[{"id":"s","type":"spawn","x":1,"y":1}]' },
    })
    fireEvent.click(byTestId('level-validate'))
    expect(byTestId('level-output').textContent).toContain('缺少出口')
  })

  it('对象列表预览', () => {
    render(<Tool />)
    fireEvent.click(byTestId('level-preview'))
    expect(byTestId('level-output').textContent).toContain('spawn1 [spawn]')
  })

  it('非法 JSON 显示错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'xxx' } })
    fireEvent.click(byTestId('level-validate'))
    expect(byTestId('level-error').textContent).toContain('合法 JSON')
  })
})
