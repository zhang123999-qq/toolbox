// @vitest-environment jsdom
/**
 * read-aloud 组件测试（#740）：语音朗读界面（jsdom 无 speechSynthesis，测降级与参数）。
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

describe('read-aloud · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    for (const id of ['rate', 'pitch', 'volume', 'voice', 'speak-btn', 'stop-btn', 'queue-info']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('jsdom 无 speechSynthesis 时显示不支持提示', () => {
    render(<Tool />)
    expect(byTestId('unsupported').textContent).toContain('当前浏览器不支持语音朗读')
  })

  it('不支持时朗读按钮禁用', () => {
    render(<Tool />)
    expect((byTestId('speak-btn') as HTMLButtonElement).disabled).toBe(true)
  })

  it('输入文本后显示分句数', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '第一句。第二句！第三句？' } })
    expect(byTestId('queue-info').textContent).toContain('3 句')
  })

  it('空输入提示填写文本', () => {
    render(<Tool />)
    expect(byTestId('queue-info').textContent).toContain('填写要朗读的文本')
  })

  it('调整语速滑杆更新显示值', () => {
    render(<Tool />)
    fireEvent.change(byTestId('rate'), { target: { value: '1.5' } })
    expect(byTestId('rate-value').textContent).toBe('1.5')
  })

  it('合法参数下无错误提示', () => {
    render(<Tool />)
    expect(screen.queryByTestId('param-error')).toBeNull()
  })

  it('点示例填入示例文本', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(byTestId('queue-info').textContent).toContain('句')
  })
})
