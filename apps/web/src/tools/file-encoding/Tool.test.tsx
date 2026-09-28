// @vitest-environment jsdom
/**
 * file-encoding 组件测试
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

describe('file-encoding · Tool', () => {
  it('渲染后 7 个必需 data-testid 与文件入口存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('上传 ASCII 文件 → 检测结果与预览', async () => {
    render(<Tool />)
    const f = new File([new TextEncoder().encode('hello encoding')], 'a.txt')
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    await waitFor(() => expect(output()).toContain('检测结果：ASCII'), { timeout: 10000 })
    expect(output()).toContain('hello encoding')
  })

  it('上传 GBK 文件 → 给出检测结果', async () => {
    render(<Tool />)
    const f = new File([new Uint8Array([0xc4, 0xe3, 0xba, 0xc3])], 'gb.txt')
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    await waitFor(() => expect(output()).toContain('检测结果：'), { timeout: 10000 })
    expect(output()).toContain('候选：')
  })

  it('空文件 → 中文报错', async () => {
    render(<Tool />)
    const f = new File([], 'empty.txt')
    fireEvent.change(byTestId('file'), { target: { files: [f] } })
    await waitFor(() => expect(output()).toContain('空文件无法检测编码'), { timeout: 10000 })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
