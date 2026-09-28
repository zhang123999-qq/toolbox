// @vitest-environment jsdom
/**
 * file-to-base64 组件测试
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('file-to-base64 · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例 → 运行 → 输出 Base64', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    expect(output()).toContain('aGVsbG8gd29ybGQ=')
  })

  it('选择文件后直接出结果', async () => {
    render(<Tool />)
    const f = new File([new TextEncoder().encode('hello')], 'a.txt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    await waitFor(() => expect(output()).toContain('文件：a.txt'), { timeout: 10000 })
    expect(output()).toContain('aGVsbG8=')
  })

  it('DataURL 开关生效', async () => {
    render(<Tool />)
    const f = new File([new TextEncoder().encode('x')], 'a.png', { type: 'image/png' })
    fireEvent.click(screen.getByLabelText('输出 DataURL'))
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    await waitFor(() => expect(output()).toContain('data:image/png;base64,'), { timeout: 10000 })
  })

  it('清空后回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
