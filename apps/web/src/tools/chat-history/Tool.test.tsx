// @vitest-environment jsdom
/**
 * chat-history 组件测试：localStorage 真实可用（jsdom），不联网。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)
beforeEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素')
  return el
}

function addOne(
  title = '复利问题',
  model = 'gpt-4o',
  messages = 'user: 什么是复利？\nassistant: 利滚利',
): void {
  fireEvent.change(byTestId('session-title'), { target: { value: title } })
  fireEvent.change(byTestId('session-model'), { target: { value: model } })
  fireEvent.change(byTestId('session-messages'), { target: { value: messages } })
  fireEvent.click(byTestId('add-session'))
}

describe('chat-history · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('手动添加 → 列表出现并持久化到 localStorage', async () => {
    render(<Tool />)
    addOne()
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    expect(byTestId('notice').textContent).toContain('已添加 1 条对话')
    expect(localStorage.getItem('toolbox:chat-history:sessions')).toContain('复利问题')
  })

  it('标题为空 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('session-model'), { target: { value: 'm' } })
    fireEvent.change(byTestId('session-messages'), { target: { value: 'user: hi' } })
    fireEvent.click(byTestId('add-session'))
    expect(byTestId('error').textContent).toContain('标题不能为空')
  })

  it('消息格式错误 → 指出行号', () => {
    render(<Tool />)
    fireEvent.change(byTestId('session-title'), { target: { value: 't' } })
    fireEvent.change(byTestId('session-model'), { target: { value: 'm' } })
    fireEvent.change(byTestId('session-messages'), { target: { value: 'user: hi\n乱写' } })
    fireEvent.click(byTestId('add-session'))
    expect(byTestId('error').textContent).toContain('第 2 行格式错误')
  })

  it('导入 JSON → 列表出现；非法 JSON 报中文错', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('import-text'), {
      target: {
        value: JSON.stringify([
          { title: '导入的', model: 'claude', messages: [{ role: 'user', content: 'hi' }] },
          { title: '坏的' },
        ]),
      },
    })
    fireEvent.click(byTestId('import-btn'))
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    expect(byTestId('notice').textContent).toContain('跳过 1 条非法记录')
    fireEvent.change(byTestId('import-text'), { target: { value: '{oops' } })
    fireEvent.click(byTestId('import-btn'))
    expect(byTestId('error').textContent).toContain('JSON 解析失败')
  })

  it('搜索过滤 + 模型筛选', async () => {
    render(<Tool />)
    addOne('复利问题', 'gpt-4o')
    addOne('旅游攻略', 'claude', 'user: 推荐景点\nassistant: 故宫、外滩')
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(2))
    fireEvent.change(byTestId('input'), { target: { value: '复利' } })
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    fireEvent.change(byTestId('input'), { target: { value: '' } })
    fireEvent.change(byTestId('option-modelFilter'), { target: { value: 'claude' } })
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    expect(screen.queryAllByTestId('session-item')[0]!.textContent).toContain('旅游攻略')
  })

  it('删除单条 → 列表减少', async () => {
    render(<Tool />)
    addOne()
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    const del = screen
      .queryAllByTestId('session-item')[0]!
      .querySelector('button') as HTMLButtonElement
    fireEvent.click(del)
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(0))
  })

  it('清空全部需二次确认', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<Tool />)
    addOne()
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    fireEvent.click(byTestId('clear-all'))
    expect(confirm).toHaveBeenCalled()
    expect(screen.queryAllByTestId('session-item')).toHaveLength(1)
    confirm.mockReturnValue(true)
    fireEvent.click(byTestId('clear-all'))
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(0))
    confirm.mockRestore()
  })

  it('刷新后从 localStorage 恢复', async () => {
    const { unmount } = render(<Tool />)
    addOne()
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
    unmount()
    cleanup()
    render(<Tool />)
    await waitFor(() => expect(screen.queryAllByTestId('session-item')).toHaveLength(1))
  })
})
