// @vitest-environment jsdom
/**
 * language-tag 组件测试（#721）：输入标签实时输出解析。
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

describe('language-tag · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入标签输出解析与中文含义', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'zh-Hant-TW' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('规范化标签：zh-Hant-TW')
    expect(out).toContain('中文（繁体，台湾）')
  })

  it('非法标签输出中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not a tag!' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('标签非法')
  })

  it('点示例填入示例标签', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('zh-Hant-TW')
  })
})
