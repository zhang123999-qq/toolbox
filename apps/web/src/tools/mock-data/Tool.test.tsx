// @vitest-environment jsdom
/**
 * mock-data 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

/** 输出区文本 */
function output(): string {
  return byTestId('output').textContent ?? ''
}

/** 解析输出区里的 JSON */
function rows(): Record<string, unknown>[] {
  return JSON.parse(output()) as Record<string, unknown>[]
}

const SIMPLE = '{"name":"@cname","email":"@email"}'

describe('mock-data · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入模板后按默认条数生成数据', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: SIMPLE } })
    expect(rows()).toHaveLength(5)
    expect(rows()[0]?.email).toMatch(/@/)
  })

  it('点击「示例」填入完整演示模板并生成 5 条', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(rows()).toHaveLength(5)
    expect(Object.keys(rows()[0] ?? {})).toContain('createdAt')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切换「数量」后行数随之变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: SIMPLE } })
    fireEvent.change(screen.getByLabelText('数量'), { target: { value: '20' } })
    expect(rows()).toHaveLength(20)
  })

  it('默认可复现：结果不随渲染次数变化', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: SIMPLE } })
    const first = output()
    fireEvent.click(byTestId('run'))
    expect(output()).toBe(first)
  })

  it('取消「可复现」后重新生成会得到不同的数据', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '{"id":"@uuid","n":"@number(1,1000000)"}' },
    })
    const first = output()
    fireEvent.click(screen.getByLabelText('可复现（按内容取种子）'))
    expect(output()).not.toBe(first)
  })

  it('未知占位符时输出区转为 role=alert 的错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '{"a":"@nope"}' } })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('未知的占位符')
  })
})
