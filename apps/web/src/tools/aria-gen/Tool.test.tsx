// @vitest-environment jsdom
/**
 * aria-gen 组件测试（#717）：默认 dialog 片段实时渲染；切换类型与非法输入分支。
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

function setOption(key: string, value: string) {
  const el = screen.getByTestId('option-' + key)
  fireEvent.change(el, { target: { value } })
}

describe('aria-gen · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认生成 dialog 片段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '登录框' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('role="dialog"')
    expect(out).toContain('登录框')
    expect(out).toContain('使用说明')
  })

  it('点示例填入对话框示例', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('确认删除对话框')
    expect(byTestId('output').textContent).toContain('aria-modal="true"')
  })

  it('切换到 slider 缺数值时行内报错', () => {
    render(<Tool />)
    const select = screen.getByLabelText('组件类型')
    fireEvent.change(select, { target: { value: 'slider' } })
    fireEvent.change(byTestId('input'), { target: { value: '音量' } })
    expect(byTestId('output').textContent).toContain('需要提供最小值')
  })

  it('slider 填好数值后生成片段', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('组件类型'), { target: { value: 'slider' } })
    setOption('min', '0')
    setOption('max', '100')
    setOption('value', '30')
    fireEvent.change(byTestId('input'), { target: { value: '音量' } })
    expect(byTestId('output').textContent).toContain('aria-valuenow="30"')
  })

  it('input 类型缺 id 行内报错', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('组件类型'), { target: { value: 'input' } })
    fireEvent.change(byTestId('input'), { target: { value: '姓名' } })
    expect(byTestId('output').textContent).toContain('需要提供 id')
  })
})
