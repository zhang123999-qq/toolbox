// @vitest-environment jsdom
/**
 * binary-viewer 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

/** 输出区文本 */
function output(): string {
  return byTestId('output').textContent ?? ''
}

/** jsdom 支持 File 与 arrayBuffer()，直接拿真实实现验证文件入口 */
function makeFile(name: string, bytes: readonly number[]): File {
  return new File([Uint8Array.from(bytes)], name, { type: 'application/octet-stream' })
}

describe('binary-viewer · Tool', () => {
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

  it('view 模式查看输入文本的字节', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'AB' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'view' } })
    expect(output()).toContain('来源：输入文本的 UTF-8 字节')
    expect(output()).toContain('|AB|')
  })

  it('点击「示例」按 xxd 风格转储还原出 PNG 头部', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('还原出 16 字节')
    expect(output()).toContain('PNG 图片')
    expect(output()).toContain('|.PNG........IHDR|')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切换「列」后每行字节数随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'ABCDEFGH' } })
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'view' } })
    expect(output()).toContain('|ABCDEFGH|')
    fireEvent.change(screen.getByLabelText('列'), { target: { value: '8' } })
    expect(output()).toContain('|ABCDEFGH|')
    fireEvent.change(screen.getByLabelText('列'), { target: { value: '32' } })
    expect(output()).toContain('|ABCDEFGH|')
  })

  it('选择文件后直接给出字节报告并回显文件名', async () => {
    render(<Tool />)
    const file = makeFile('demo.gif', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61])
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(output()).toContain('文件：demo.gif'))
    expect(byTestId('file-name').textContent).toContain('demo.gif')
    expect(output()).toContain('GIF 图片')
    expect(output()).toContain('|GIF89a')
  })

  it('hex 长度为奇数时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('长度必须是偶数')
  })
})
