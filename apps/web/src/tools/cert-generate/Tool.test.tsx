// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}"`)
  return el
}

describe('cert-generate · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('填 CN → 示例 → 运行后生成证书', async () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('通用名（CN）'), {
      target: { value: 'example.localhost' },
    })
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      const output = byTestId('output').textContent ?? ''
      expect(output).toContain('BEGIN CERTIFICATE')
    })
  })

  it('清空 CN 后运行进入错误态', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('通用名（CN）'), { target: { value: '' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').getAttribute('role')).toBe('alert')
      expect(byTestId('output').textContent).toContain('通用名')
    })
  })

  it('点清空回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })
})
