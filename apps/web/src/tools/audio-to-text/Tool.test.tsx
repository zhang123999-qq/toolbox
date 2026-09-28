// @vitest-environment jsdom
/**
 * audio-to-text 组件测试
 *
 * SpeechRecognition 全 mock：捕获实例，手动触发 onresult / onerror，
 * 验证连续听写的段落累积与临时候选显示。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

interface MockInstance {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: unknown) => void) | null
  onerror: ((e: { error: string }) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

const instances: MockInstance[] = []

class MockSpeechRecognition implements MockInstance {
  lang = ''
  continuous = false
  interimResults = false
  onresult: ((e: unknown) => void) | null = null
  onerror: ((e: { error: string }) => void) | null = null
  onend: (() => void) | null = null
  start = vi.fn()
  stop = vi.fn()
  constructor() {
    instances.push(this)
  }
}

/** 构造一次识别事件：finals 为定稿句，interims 为临时候选 */
function makeResultEvent(finals: string[], interims: string[]): unknown {
  const items = [
    ...finals.map((t) => ({ isFinal: true, length: 1, 0: { transcript: t } })),
    ...interims.map((t) => ({ isFinal: false, length: 1, 0: { transcript: t } })),
  ]
  const results: Record<string, unknown> = { length: items.length }
  items.forEach((r, i) => {
    results[String(i)] = r
  })
  return { resultIndex: 0, results }
}

function stubSpeech(): void {
  instances.length = 0
  vi.stubGlobal('SpeechRecognition', MockSpeechRecognition as unknown as never)
  vi.stubGlobal('webkitSpeechRecognition', undefined)
}

beforeEach(stubSpeech)

describe('audio-to-text · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供语言选择与听写按钮', () => {
    render(<Tool />)
    expect(byTestId('lang')).toBeTruthy()
    expect(byTestId('start-stop').textContent).toBe('开始听写')
    expect(byTestId('transcript')).toBeTruthy()
  })

  it('开始听写 → 定稿句累积成段', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('停止听写'))
    const rec = instances[0]!
    expect(rec.lang).toBe('zh-CN')
    expect(rec.continuous).toBe(true)
    rec.onresult!(makeResultEvent(['你好'], []))
    await waitFor(() => expect(byTestId('transcript').textContent).toContain('你好'))
    rec.onresult!(makeResultEvent(['今天天气不错'], []))
    await waitFor(() => expect(byTestId('transcript').textContent).toContain('你好\n今天天气不错'))
    expect(byTestId('summary').textContent).toContain('共 2 段')
  })

  it('临时候选单独显示「识别中」', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(instances[0]).toBeTruthy())
    instances[0]!.onresult!(makeResultEvent([], ['正在说的话']))
    await waitFor(() => expect(byTestId('transcript').textContent).toContain('正在说的话'))
    expect(byTestId('transcript').textContent).toContain('识别中')
  })

  it('识别出错 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(instances[0]).toBeTruthy())
    instances[0]!.onerror!({ error: 'no-speech' })
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('没有检测到语音')
  })

  it('停止听写 → 按钮恢复、临时候选清空', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(instances[0]).toBeTruthy())
    instances[0]!.onresult!(makeResultEvent([], ['临时候选']))
    await waitFor(() => expect(byTestId('transcript').textContent).toContain('临时候选'))
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(byTestId('start-stop').textContent).toBe('开始听写'))
    expect(instances[0]!.stop).toHaveBeenCalled()
  })

  it('清空文字按钮清空转写', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    await waitFor(() => expect(instances[0]).toBeTruthy())
    instances[0]!.onresult!(makeResultEvent(['你好'], []))
    await waitFor(() => expect(byTestId('clear-transcript')).toBeTruthy())
    fireEvent.click(byTestId('clear-transcript'))
    await waitFor(() => expect(byTestId('transcript').textContent).toContain('请对着麦克风说话'))
    expect(byTestId('transcript').textContent).not.toContain('你好')
  })

  it('浏览器不支持语音识别 → 中文提示且按钮禁用', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    render(<Tool />)
    expect(byTestId('unsupported').textContent).toContain('不支持语音识别')
    expect((byTestId('start-stop') as HTMLButtonElement).disabled).toBe(true)
  })
})
