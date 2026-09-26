// @vitest-environment jsdom
/**
 * bson-codec 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

describe('bson-codec · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('示例编码出 hex 与 JSON 预览', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('hex   :')
    expect(output()).toContain('"$oid": "507f1f77bcf86cd799439011"')
  })

  it('切到解码模式后还原 JSON', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input'), { target: { value: '0c000000106e000100000000' } })
    expect(output()).toContain('"n": 1')
  })

  it('非法的 BSON 字节让输出区进入 role=alert', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'decode' } })
    fireEvent.change(byTestId('input'), { target: { value: '0f000000106e00' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('顶层不是对象时报错', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[1,2]' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
