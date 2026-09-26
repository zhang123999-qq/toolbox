// @vitest-environment jsdom
/**
 * file-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * jsdom 里 WebCrypto 可用，故文本与文件两条路径都跑真实实现。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

/** 造一个带内容的文件；jsdom 支持 File 与 arrayBuffer() */
function makeFile(content: string): File {
  return new File([new TextEncoder().encode(content)], 'demo.bin', {
    type: 'application/octet-stream',
  })
}

describe('file-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
  })

  it('示例 → 运行 → 输出全部算法的摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('输入：11 字符 / 11 字节'), { timeout: 10000 })
    expect(output()).toMatch(/MD5\s+[0-9a-f]{32}/)
    expect(output()).toMatch(/SHA-256\s+[0-9a-f]{64}/)
  })

  it('切到单个算法后只输出一行', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('算法'), { target: { value: 'sha256' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(output()).toContain(
        'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
      ),
    )
    expect(output()).not.toContain('MD5')
  })

  it('选择文件后直接出结果，并回显文件名', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeFile('abc')] } })
    await waitFor(() => expect(output()).toContain('文件：demo.bin'), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('demo.bin')
    expect(output()).toContain('900150983cd24fb0d6963f7d28e17f72')
  })

  it('点击「清空」回到空输入', () => {
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
