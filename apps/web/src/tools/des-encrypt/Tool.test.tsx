// @vitest-environment jsdom
/**
 * des-encrypt 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

describe('des-encrypt · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('密钥与 IV 用附加输入框承载（input-key / input-iv）', () => {
    render(<Tool />)
    expect(byTestId('input-key')).toBeTruthy()
    expect(byTestId('input-iv')).toBeTruthy()
  })

  it('点击「示例」后输出 `<iv>.<密文>` 形式的密文', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toMatch(/^[A-Za-z0-9+/]+=*\.[A-Za-z0-9+/]+=*$/)
  })

  it('示例 → 密文 → 切到解密方向能还原原文', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const cipher = output()
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'decrypt' } })
    fireEvent.change(byTestId('input'), { target: { value: cipher } })
    expect(output()).toBe('这是一段需要加密的明文。')
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

  it('密钥长度不符进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.change(byTestId('input-key'), { target: { value: '0123456789abcdef' } })
    fireEvent.change(byTestId('input-iv'), { target: { value: 'ivvector' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('解密方向遇到非法密文进入错误态（role=alert）', () => {
    render(<Tool />)
    fireEvent.change(screen.getByLabelText('方向'), { target: { value: 'decrypt' } })
    fireEvent.change(byTestId('input-key'), { target: { value: 'deskey01' } })
    fireEvent.change(byTestId('input-iv'), { target: { value: 'ivvector' } })
    fireEvent.change(byTestId('input'), { target: { value: '@@@@' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })
})
