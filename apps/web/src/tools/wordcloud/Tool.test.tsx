// @vitest-environment jsdom
/**
 * wordcloud 组件测试（#675）
 *
 * 说明：canvas 绘制是浏览器能力，jsdom 的 getContext('2d') 返回 null；
 * 此处只测渲染、输入校验、空结果态与 PNG 导出守卫，布局纯函数由 utils 测试覆盖。
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'
import { EXAMPLE_TEXT } from './utils'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

describe('wordcloud · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'wordcloud-canvas', 'download-png', 'word-count']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('点示例填入示例文本并统计词数', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe(EXAMPLE_TEXT)
    expect(byTestId('word-count').textContent).toContain('共')
  })

  it('非法显示词数进入错误态', () => {
    render(<Tool />)
    // 通过选项输入框把显示词数改为非法值
    const topNInput = screen.getByText('显示词数').querySelector('input')
    expect(topNInput).toBeTruthy()
    fireEvent.change(topNInput!, { target: { value: 'abc' } })
    const alert = byTestId('output').querySelector('[role="alert"]')
    expect(alert).toBeTruthy()
    expect(alert?.textContent).toContain('显示词数')
  })

  it('纯停用词文本提示无有效词汇', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '的了在是我' } })
    expect(byTestId('output').textContent).toContain('未提取到有效词汇')
    expect(byTestId('word-count').textContent).toContain('共 0 个词')
  })

  it('点下载 PNG 时 canvas 不存在守卫（jsdom 无 canvas 上下文）', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    const spy = vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,AAA')
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    fireEvent.click(byTestId('download-png'))
    // jsdom 下 canvas 存在但 pendingWords 非空 → 走正常导出分支
    expect(spy).toHaveBeenCalledWith('image/png')
    expect(clickSpy).toHaveBeenCalled()
    spy.mockRestore()
    clickSpy.mockRestore()
  })
})
