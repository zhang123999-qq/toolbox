// @vitest-environment jsdom
/**
 * ass-convert 组件测试
 *
 * 纯文本转换：输入 ASS → 输出目标格式；非法输入 / 参数错误 → 中文提示。
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

/**
 * 取带标签的表单控件。MultiPanel 的 select / checkbox 下拉不带 data-testid（模板公共代码，
 * 不在本次 8 个目录内，不动），改用 label 文本定位。
 */
function byLabel(label: string): HTMLElement {
  return screen.getByLabelText(label)
}

describe('ass-convert · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供目标格式 / 偏移量 / 保留样式段选项', () => {
    render(<Tool />)
    expect(byLabel('目标格式')).toBeTruthy()
    expect(byTestId('option-offsetMs')).toBeTruthy()
    expect(byLabel('ASS 输出时保留样式段')).toBeTruthy()
  })

  it('载入示例 → 默认转 SRT', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('1\n00:00:01,000 --> 00:00:04,000')
    expect(out).toContain('你好，世界')
  })

  it('目标为 ASS 且保留样式段 → 输出含 [V4+ Styles]', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byLabel('目标格式'), { target: { value: 'ass' } })
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('[V4+ Styles]')
    expect(out).toContain('Dialogue: 0,0:00:01.00,0:00:04.00,')
  })

  it('取消保留样式段 → ASS 输出不含样式段', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byLabel('目标格式'), { target: { value: 'ass' } })
    fireEvent.click(byLabel('ASS 输出时保留样式段'))
    const out = byTestId('result-text').textContent ?? ''
    expect(out).not.toContain('[V4+ Styles]')
    expect(out).toContain('[Script Info]')
  })

  it('设置偏移 1000ms → 时间轴整体后移', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byLabel('目标格式'), { target: { value: 'ass' } })
    fireEvent.change(byTestId('option-offsetMs'), { target: { value: '1000' } })
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('Dialogue: 0,0:00:02.00,0:00:05.00,')
  })

  it('输入缺少 [Events] 段 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '[Script Info]\nTitle: x' } })
    expect(byTestId('error')).toBeTruthy()
    expect(byTestId('error').textContent).toContain('[Events]')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('result-text')).toBeNull()
  })

  it('下载按钮存在并标注扩展名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byLabel('目标格式'), { target: { value: 'ass' } })
    expect(byTestId('download-result').textContent).toContain('.ass')
  })
})
