// @vitest-environment jsdom
/**
 * date-locale 组件测试（#723）：输入日期实时输出多 locale 对比。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('date-locale · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'option-locales']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('输入日期实时输出多 locale 结果', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-09-28 15:30:00' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('相对时间：')
    expect(out).toContain('zh-CN')
    expect(out).toContain('en-US')
  })

  it('修改语言区域选项生效', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '2026-09-28 15:30:00' } })
    fireEvent.change(byTestId('option-locales'), { target: { value: 'de-DE' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('de-DE')
    expect(out).not.toContain('| zh-CN]')
  })

  it('非法日期输出中文错误', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '不是日期' } })
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('无法解析日期')
  })

  it('点示例填入示例日期', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('output').textContent ?? ''
    expect(out).toContain('相对时间：')
  })
})
