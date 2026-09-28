// @vitest-environment jsdom
/**
 * vtt-convert 组件测试
 *
 * 纯文本转换：输入 VTT → 输出目标格式；非法输入 / 参数错误 → 中文提示。
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

describe('vtt-convert · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供目标格式与偏移量选项', () => {
    render(<Tool />)
    expect(byLabel('目标格式')).toBeTruthy()
    expect(byTestId('option-offsetMs')).toBeTruthy()
  })

  it('载入示例 → 默认转 SRT，输出含序号与逗号时间戳', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('1\n00:00:01,000 --> 00:00:04,000')
    expect(out).toContain('你好，世界')
  })

  it('切换目标为 VTT → 输出带 WEBVTT 文件头', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byLabel('目标格式'), { target: { value: 'vtt' } })
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('WEBVTT')
    expect(out).toContain('00:00:05.500 --> 00:00:08.000')
  })

  it('设置偏移 1000ms → 时间轴整体后移', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('option-offsetMs'), { target: { value: '1000' } })
    const out = byTestId('result-text').textContent ?? ''
    expect(out).toContain('00:00:02,000 --> 00:00:05,000')
  })

  it('输入缺少文件头 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: '1\n00:00:01,000 --> 00:00:02,000\n文本' },
    })
    expect(byTestId('error')).toBeTruthy()
    expect(byTestId('error').textContent).toContain('WEBVTT')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('result-text')).toBeNull()
  })

  it('空输入 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    expect(byTestId('error').textContent).toContain('WEBVTT')
  })

  it('下载按钮存在并标注扩展名', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('download-result').textContent).toContain('.srt')
  })
})
