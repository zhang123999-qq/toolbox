// @vitest-environment jsdom
/**
 * sha3-hash 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('sha3-hash · Tool', () => {
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

  it('点运行后得到 SHA3-256 摘要（原生或内置实现路径都应一致）', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532',
      ),
    )
  })

  it('把算法切到 SHA3-512 后得到对应摘要', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('算法'), { target: { value: 'SHA3-512' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe(
        'b751850b1a57168a5693cd924b6b096e08f621827444f70d884f5d0240d2712e10e116e9192af3c91a7ec57647e3934057340b4cf408d5a56592f8274eec53f0',
      ),
    )
  })

  it('切到 Base64 格式后输出 Base64', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('格式'), { target: { value: 'base64' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() =>
      expect(byTestId('output').textContent).toBe('Ophdp0/iJbIEXBcta9OQvYVfCG4+nVJbRr/iRRFDFTI='),
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
