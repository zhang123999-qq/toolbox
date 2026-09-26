// @vitest-environment jsdom
/**
 * pgp-tool 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = document.querySelector(`[data-testid="${id}"]`)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el as HTMLElement
}

describe('pgp-tool · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点击「示例」→ 运行后输出 armor 结构', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('run'))
    const output = byTestId('output').textContent ?? ''
    expect(output).toContain('共解析 1 段 PGP Armor')
    expect(output).toContain('PUBLIC KEY')
  })

  it('非 armor 文本时输出区转为 role=alert', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not an armor' } })
    fireEvent.click(byTestId('run'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
