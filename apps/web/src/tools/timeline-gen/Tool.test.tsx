// @vitest-environment jsdom
/**
 * timeline-gen 组件测试（纯 JS 工具，无需 mock 外部库）
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLES } from './utils'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('timeline-gen · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选项区有方向与间隔开关', () => {
    render(<Tool />)
    // MultiPanel 的 select / boolean 选项无 data-testid，按 label 文本定位
    expect(screen.getByLabelText('排列方向')).toBeTruthy()
    expect(screen.getByLabelText('显示事件间隔')).toBeTruthy()
  })

  it('点击示例后生成时间线 HTML', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLES[0])
    const html = byTestId('timeline-html')
    expect(html.innerHTML).toContain('立项')
    expect(html.innerHTML).toContain('class="tl tl-vertical"')
    expect(html.innerHTML).toContain('间隔')
  })

  it('切换横向后容器类名变化', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(screen.getByLabelText('排列方向'), { target: { value: 'horizontal' } })
    expect(byTestId('timeline-html').innerHTML).toContain('class="tl tl-horizontal"')
  })

  it('点击清空后回到空输入并显示引导文案（不进入错误态）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
    expect(byTestId('output').textContent).toContain('日期 | 标题')
  })

  it('空输入不进入错误态', () => {
    render(<Tool />)
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('非法日期进入错误态并显示双语错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-13-01 | 坏日期' } })
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain('无法解析的日期')
  })

  it('格式错误的行进入错误态并带行号', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-01-01 | 好\n坏行' } })
    expect(screen.getByRole('alert').textContent).toContain('第 2 行')
  })

  it('标题中的脚本标签被转义而非执行', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '2026-01-01 | <img src=x onerror=alert(1)>' },
    })
    const html = byTestId('timeline-html').innerHTML
    expect(html).toContain('&lt;img')
    expect(byTestId('timeline-html').querySelector('img')).toBeNull()
  })
})
