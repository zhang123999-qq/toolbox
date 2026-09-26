// @vitest-environment jsdom
/**
 * mime-lookup 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
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

describe('mime-lookup · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入扩展名后查出 MIME 类型', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'csv' } })
    expect(output()).toContain('csv → text/csv')
    expect(output()).toContain('CSV 表格')
  })

  it('点击「示例」一次查四类变体写法', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toContain('png → image/png')
    expect(output()).toContain('svg → image/svg+xml')
    expect(output()).toContain('jpg → image/jpeg')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })

  it('切到 mime2ext 后由 MIME 反查扩展名', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'image/png' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'mime2ext' } })
    expect(output()).toContain('.png')
  })

  it('切到 search 后给出命中条数与多条记录', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'webp' } })
    fireEvent.change(screen.getByLabelText('模式'), { target: { value: 'search' } })
    expect(output()).toContain('命中')
    expect(output()).toContain('image/webp')
  })

  it('勾选「严格模式」后未命中进入 role=alert 错误态', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'not-a-real-ext' } })
    fireEvent.click(screen.getByLabelText('严格模式'))
    expect(byTestId('output').getAttribute('role')).toBe('alert')
    expect(output()).toContain('未收录')
  })
})
