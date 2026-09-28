// @vitest-environment jsdom
/**
 * noise-gen 组件测试：jsdom 不支持 canvas 2d context，
 * 聚焦输入校验、错误态与 canvas 元素存在性。
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

describe('noise-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('noise-canvas')).toBeTruthy()
  })

  it('点示例后仍渲染 canvas', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('noise-canvas')).toBeTruthy()
  })

  it('尺度越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-scale'), { target: { value: '99' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('尺度须在 0.005–0.1')
  })

  it('八度越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-octaves'), { target: { value: '99' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('八度须在 1–8')
  })

  it('非法种子进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-seed'), { target: { value: 'abc' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('种子格式非法')
  })
})
