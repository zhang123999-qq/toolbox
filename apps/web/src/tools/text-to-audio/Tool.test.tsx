// @vitest-environment jsdom
/**
 * text-to-audio 组件测试
 *
 * speechSynthesis 与 SpeechSynthesisUtterance 全 mock：
 * 捕获 utterance，手动触发 onend 验证分段链式朗读。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

interface MockUtterance {
  text: string
  lang: string
  rate: number
  pitch: number
  volume: number
  voice: unknown
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
}

const utterances: MockUtterance[] = []

class MockSpeechSynthesisUtterance implements MockUtterance {
  text: string
  lang = ''
  rate = 1
  pitch = 1
  volume = 1
  voice: unknown = null
  onend: (() => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  constructor(text: string) {
    this.text = text
    utterances.push(this)
  }
}

const synthMock = {
  speak: vi.fn(),
  cancel: vi.fn(),
  getVoices: vi.fn(() => [{ name: '测试音色', lang: 'zh-CN' }]),
  onvoiceschanged: null as (() => void) | null,
}

function stubSpeech(): void {
  utterances.length = 0
  synthMock.speak.mockClear()
  synthMock.cancel.mockClear()
  vi.stubGlobal('speechSynthesis', synthMock)
  vi.stubGlobal('SpeechSynthesisUtterance', MockSpeechSynthesisUtterance)
}

beforeEach(stubSpeech)

describe('text-to-audio · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供音色选择、朗读按钮与参数选项', () => {
    render(<Tool />)
    expect(byTestId('voice')).toBeTruthy()
    expect(byTestId('speak').textContent).toBe('朗读')
    expect(byTestId('option-rate')).toBeTruthy()
    expect(byTestId('option-pitch')).toBeTruthy()
  })

  it('点朗读 → 调用 speechSynthesis.speak，参数透传', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '你好世界' } })
    fireEvent.change(byTestId('option-rate'), { target: { value: '1.5' } })
    fireEvent.click(byTestId('speak'))
    expect(synthMock.speak).toHaveBeenCalledTimes(1)
    const u = utterances[0]!
    expect(u.text).toBe('你好世界')
    expect(u.rate).toBe(1.5)
    expect(u.pitch).toBe(1)
    expect(byTestId('speak-status').textContent).toContain('朗读中（1/1）')
  })

  it('长文本分段 → onend 链式朗读下一段', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), {
      target: { value: 'a'.repeat(150) + '。' + 'b'.repeat(150) },
    })
    fireEvent.click(byTestId('speak'))
    expect(synthMock.speak).toHaveBeenCalledTimes(1)
    expect(utterances[0]!.text).toBe('a'.repeat(150) + '。')
    act(() => utterances[0]!.onend!())
    expect(synthMock.speak).toHaveBeenCalledTimes(2)
    expect(utterances[1]!.text).toBe('b'.repeat(150))
    expect(byTestId('speak-status').textContent).toContain('朗读中（2/2）')
    act(() => utterances[1]!.onend!())
    expect(byTestId('speak-status').textContent).toContain('朗读完成')
    expect(byTestId('speak')).toBeTruthy()
  })

  it('点停止 → cancel 被调用', () => {
    render(<Tool />)
    fireEvent.click(byTestId('speak'))
    expect(byTestId('stop')).toBeTruthy()
    fireEvent.click(byTestId('stop'))
    expect(synthMock.cancel).toHaveBeenCalled()
    expect(byTestId('speak-status').textContent).toContain('已停止')
  })

  it('空文本 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: '   ' } })
    fireEvent.click(byTestId('speak'))
    expect(byTestId('error').textContent).toContain('请输入要朗读的文字')
    expect(synthMock.speak).not.toHaveBeenCalled()
  })

  it('语速非法 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-rate'), { target: { value: '99' } })
    fireEvent.click(byTestId('speak'))
    expect(byTestId('error').textContent).toContain('语速不能大于')
  })

  it('浏览器不支持语音合成 → 中文提示且按钮禁用', () => {
    vi.stubGlobal('speechSynthesis', undefined)
    vi.stubGlobal('SpeechSynthesisUtterance', undefined)
    render(<Tool />)
    expect(byTestId('unsupported').textContent).toContain('不支持语音合成')
    expect((byTestId('speak') as HTMLButtonElement).disabled).toBe(true)
  })
})
