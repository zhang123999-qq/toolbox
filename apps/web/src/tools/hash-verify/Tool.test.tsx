// @vitest-environment jsdom
/**
 * hash-verify 组件测试：示例校验与不匹配场景（WebCrypto 真实可用）。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

const ABC_SHA256 = 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad'

describe('hash-verify · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例运行校验匹配', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('匹配')
    })
    expect(byTestId('output').textContent).toContain(ABC_SHA256)
  })

  it('数据被篡改时判不匹配', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input'), { target: { value: 'abd' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('不匹配')
    })
  })

  it('缺期望哈希时报错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.change(byTestId('option-expected'), { target: { value: '' } })
    fireEvent.click(byTestId('run'))
    await waitFor(() => {
      expect(byTestId('output').textContent).toContain('期望哈希不能为空')
    })
  })
})
