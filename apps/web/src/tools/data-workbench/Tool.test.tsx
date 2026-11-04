// @vitest-environment jsdom
/**
 * data-workbench 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

/** 输出区的元素 */
function out(): HTMLElement {
  return byTestId('output')
}

describe('data-workbench · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('默认流水线：输入经整理后给出每步结果与最终结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    // 模板对输入做 300ms 防抖快照后才重算，断言需等待
    await vi.waitFor(() => expect(output()).toContain('== 步骤 1 · trimlines =='))
    expect(output()).toContain('== 步骤 4 · dedupe ==')
    expect(output().trimEnd()).toMatch(/== 最终结果 ==\n橙子\n苹果\n香蕉$/)
  })

  it('改写「流水线步骤」后立即按新步骤重算', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'ab' } })
    fireEvent.change(screen.getByTestId('option-steps'), { target: { value: 'upper' } })
    await vi.waitFor(() => expect(output()).toContain('AB'))
  })

  it('点击「清空」回到空输入（步骤保留）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect((screen.getByTestId('option-steps') as HTMLTextAreaElement).value).toContain('trimlines')
  })

  it('切到 final 模式后只输出最终结果', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'final' } })
    await vi.waitFor(() => expect(output()).toBe('橙子\n苹果\n香蕉'))
  })

  it('JSON → YAML → JSON 的流水线在界面上跑通', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":1,"b":["x"]}' } })
    fireEvent.change(screen.getByTestId('option-steps'), {
      target: { value: 'json2yaml\nyaml2json' },
    })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'final' } })
    await vi.waitFor(() => expect(JSON.parse(output())).toEqual({ a: 1, b: ['x'] }))
  })

  it('未知步骤时输出区转为 role=alert 的错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'x' } })
    fireEvent.change(screen.getByTestId('option-steps'), { target: { value: 'nope' } })
    await vi.waitFor(() => expect(out().getAttribute('role')).toBe('alert'))
    expect(output()).toContain('未知的步骤')
  })

  it('步骤为空时给出提示而不进入错误态', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'x' } })
    fireEvent.change(screen.getByTestId('option-steps'), { target: { value: '' } })
    await vi.waitFor(() => expect(output()).toContain('没有可执行的步骤'))
    expect(out().getAttribute('role')).not.toBe('alert')
  })
})
