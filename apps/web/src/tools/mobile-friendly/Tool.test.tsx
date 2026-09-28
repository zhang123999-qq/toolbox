// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('mobile-friendly · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('粘贴模式点运行输出得分', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '<html><head><meta name="viewport" content="width=device-width"></head></html>' },
    })
    fireEvent.click(byTestId('run'))
    await new Promise((r) => setTimeout(r, 50))
    expect(byTestId('output').textContent).toContain('移动友好得分')
  })

  it('空输入点运行不进入错误态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await new Promise((r) => setTimeout(r, 50))
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('示例填入 HTML', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toContain('viewport')
  })
})
