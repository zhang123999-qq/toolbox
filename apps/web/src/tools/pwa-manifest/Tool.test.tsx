// @vitest-environment jsdom
/**
 * pwa-manifest 组件测试（#629）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('pwa-manifest · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后输出 manifest.json（缺 short_name 报错）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 示例只填 name，short_name 为空 → 中文错误
    expect(byTestId('output').textContent).toContain('short_name（短名称）不能为空')
  })

  it('填写 short_name 后输出合法 manifest', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByPlaceholderText('应用'), { target: { value: '应用' } })
    const text = byTestId('output').textContent ?? ''
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
    const obj = JSON.parse(text)
    expect(obj.name).toBe('我的应用')
    expect(obj.short_name).toBe('应用')
    expect(obj.display).toBe('standalone')
  })

  it('name 为空时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    expect(byTestId('output').textContent).toContain('name（应用名称）不能为空')
  })

  it('主题色格式错误时中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '我的应用' } })
    fireEvent.change(screen.getByPlaceholderText('应用'), { target: { value: '应用' } })
    fireEvent.change(screen.getByPlaceholderText('#2563eb'), { target: { value: 'red' } })
    expect(byTestId('output').textContent).toContain('theme_color 格式错误')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
