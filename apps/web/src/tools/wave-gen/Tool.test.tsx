// @vitest-environment jsdom
/**
 * wave-gen 组件测试
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

describe('wave-gen · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('option-amplitude')).toBeTruthy()
  })

  it('默认空输入渲染出 SVG 波浪', () => {
    render(<Tool />)
    const output = byTestId('output')
    expect(output.querySelector('svg')).toBeTruthy()
    expect((output.querySelectorAll('path') ?? []).length).toBeGreaterThan(0)
  })

  it('点示例后仍渲染 SVG', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').querySelector('svg')).toBeTruthy()
  })

  it('振幅越界进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-amplitude'), { target: { value: '999' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('振幅须在 10–150')
  })

  it('非法颜色进入错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-color1'), { target: { value: 'red' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('起始色格式非法')
  })
})
