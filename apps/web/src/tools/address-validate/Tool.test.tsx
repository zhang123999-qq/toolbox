// @vitest-environment jsdom
/**
 * address-validate 组件测试：聚焦批量校验渲染、有效/无效态与错误态。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

const GOOD = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAed'
const LOWER = '0x5aaeb6053f3e94c9b9a09f33669435e7ef1beaed'
const BAD_CHECKSUM = '0x5aAeb6053F3E94C9b9A09f33669435E7Ef1BeAec'

describe('address-validate · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'results',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例批量校验：有效 / 全小写提示 / 无效', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('valid-0').textContent).toContain('✓ 有效地址')
    expect(byTestId('checksummed-0').textContent).toContain(GOOD)
    expect(byTestId('valid-1').textContent).toContain('✓ 有效地址')
    expect(byTestId('result-1').textContent).toContain('EIP-55')
    expect(byTestId('valid-2').textContent).toContain('✗ 无效地址')
    expect(byTestId('result-2').textContent).toContain('checksum 校验失败')
  })

  it('单地址输入校验', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: LOWER } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('valid-0').textContent).toContain('✓ 有效地址')
    expect(byTestId('checksummed-0').textContent).toContain(GOOD)
  })

  it('非法地址行内报错而非整体崩溃', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: `${GOOD}\n0x1234` } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('valid-0').textContent).toContain('✓ 有效地址')
    expect(byTestId('valid-1').textContent).toContain('✗ 无效地址')
    expect(byTestId('result-1').textContent).toContain('地址长度错误')
  })

  it('checksum 错误地址判无效', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: BAD_CHECKSUM } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('valid-0').textContent).toContain('✗ 无效地址')
  })
})
