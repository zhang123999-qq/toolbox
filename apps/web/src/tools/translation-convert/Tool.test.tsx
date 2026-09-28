// @vitest-environment jsdom
/**
 * translation-convert 组件测试：格式转换与错误提示。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('translation-convert · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(screen.getByLabelText('源格式')).toBeTruthy()
    expect(screen.getByLabelText('目标格式')).toBeTruthy()
  })

  it('点示例将 JSON 转为 PO', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('msgid "app.title"')
    expect(out).toContain('msgstr "你好"')
  })

  it('切换为 YAML 转 JSON', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a: 1' } })
    fireEvent.change(screen.getByLabelText('源格式'), { target: { value: 'yaml' } })
    fireEvent.change(screen.getByLabelText('目标格式'), { target: { value: 'json' } })
    expect(byTestId('output').textContent).toContain('"a": "1"')
  })

  it('非法输入行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{坏' } })
    expect(byTestId('output').textContent).toContain('转换失败')
  })
})
