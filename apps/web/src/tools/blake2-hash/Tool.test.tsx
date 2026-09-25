// @vitest-environment jsdom
/**
 * blake2-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

const B2B512_ABC =
  'ba80a53f981c4d0d6a2797b69f12f6e94c212f14685ac4b74b12bb6fdbffa2d17d87c5392aab792dc252d5de4533cc9518d38aa8dbf1925ab92386edd4009923'

describe('blake2-hash · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」后填入正文，但不自动运行', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('abc')
    expect(byTestId('output').getAttribute('role')).not.toBe('alert')
  })

  it('点运行后得到 BLAKE2b-512 摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(byTestId('output').textContent).toBe(B2B512_ABC))
  })

  it('把算法切到 BLAKE2s-256 后得到对应摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('算法'), { target: { value: 'BLAKE2s-256' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        '508c5e8c327c14e2e1a72ba34eeb452f37458b209ed63a294d999b4c86675982',
      ),
    )
  })

  it('切到 Base64 格式后输出 Base64', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        'uoClP5gcTQ1qJ5e2nxL26UwhLxRoWsS3SxK7b9v/otF9h8U5Kqt5LcJS1d5FM8yVGNOKqNvxklq5I4bt1ACZIw==',
      ),
    )
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
