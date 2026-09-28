// @vitest-environment jsdom
/**
 * pagination-seo 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('pagination-seo · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'input-pageUrl',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('空输入显示提示语', () => {
    render(<Tool />)
    expect(byTestId('output').textContent).toContain('粘贴页面 HTML')
  })

  it('示例填入后显示 next 指向警告', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('output').textContent).toContain('未指向下页')
  })

  it('规范分页页显示无问题结论', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value:
          '<link rel="canonical" href="https://example.com/list?page=2">' +
          '<link rel="prev" href="https://example.com/list?page=1">' +
          '<link rel="next" href="https://example.com/list?page=3">',
      },
    })
    fireEvent.change(byTestId('input-pageUrl'), {
      target: { value: 'https://example.com/list?page=2' },
    })
    expect(byTestId('output').textContent).toContain('设置正确')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
