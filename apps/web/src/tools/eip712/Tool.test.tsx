// @vitest-environment jsdom
/**
 * eip712 组件测试：示例向量渲染、非法 JSON 与非法类型的行内报错。
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

describe('eip712 · Tool', () => {
  it('渲染后必需 data-testid 存在', () => {
    render(<Tool />)
    for (const id of ['input', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例输出 Ether Mail 官方向量 digest', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('result-0').textContent).toBe(
      'be609aee343fb3c4b28e1df9e632fca64fcfaede20f02e86244efddf30957bd2',
    )
    expect(byTestId('result-4').textContent).toBe(
      'f2cee375fa42b42143804025fc449deafd50cc031ca257e0b194a650a912090f',
    )
  })

  it('非法 JSON 行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{not json' } })
    expect(byTestId('output').textContent).toContain('合法 JSON')
  })

  it('缺字段行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1}' } })
    expect(byTestId('output').textContent).toContain('types / domain')
  })

  it('未知类型行内报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: {
        value: JSON.stringify({
          types: { EIP712Domain: [] },
          domain: {},
          primaryType: 'Nope',
          message: {},
        }),
      },
    })
    expect(byTestId('output').textContent).toContain('未知类型')
  })
})
