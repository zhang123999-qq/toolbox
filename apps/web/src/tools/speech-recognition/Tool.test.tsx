// @vitest-environment jsdom
/**
 * speech-recognition 组件测试
 *
 * SpeechRecognition 全 mock：捕获实例，手动触发 onresult / onerror，
 * 验证命令词匹配与高亮。
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

describe('speech-recognition · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供命令词文本区、语言选择与监听按钮', () => {
    render(<Tool />)
    expect(byTestId('commands')).toBeTruthy()
    expect(byTestId('lang')).toBeTruthy()
    expect(byTestId('start-stop').textContent).toBe('开始监听')
  })

  it('空命令词点开始 → 中文错误提示且不启动识别', () => {
    render(<Tool />)
    fireEvent.change(byTestId('commands'), { target: { value: '   ' } })
    fireEvent.click(byTestId('start-stop'))
    expect(byTestId('error').textContent).toContain('请至少填写一个命令词')
    expect(instances.length).toBe(0)
  })

  it('说出命令词 → 高亮并显示命中摘要', () => {
    render(<Tool />)
    fireEvent.change(byTestId('commands'), { target: { value: '打开灯\n关灯' } })
    fireEvent.click(byTestId('start-stop'))
    const rec = instances[0]!
    expect(rec.continuous).toBe(true)
    expect(screen.getAllByTestId('command-chip').length).toBe(2)
    act(() => rec.onresult!(makeResultEvent(['请打开灯'], [])))
    expect(byTestId('transcript').textContent).toContain('请打开灯')
    expect(byTestId('match-summary').textContent).toContain('命中 1/2 个命令词')
  })

  it('未命中命令词 → 显示未命中提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    act(() => instances[0]!.onresult!(makeResultEvent(['今天天气不错'], [])))
    expect(byTestId('match-summary').textContent).toContain('未命中')
  })

  it('命令词过长 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('commands'), { target: { value: 'x'.repeat(101) } })
    fireEvent.click(byTestId('start-stop'))
    expect(byTestId('error').textContent).toContain('命令词太长')
  })

  it('识别出错 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    act(() => instances[0]!.onerror!({ error: 'network' }))
    expect(byTestId('error').textContent).toContain('网络异常')
  })

  it('停止监听 → 按钮恢复', () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    expect(instances[0]).toBeTruthy()
    fireEvent.click(byTestId('start-stop'))
    expect(instances[0]!.stop).toHaveBeenCalled()
    expect(byTestId('start-stop').textContent).toBe('开始监听')
  })

  it('清空结果按钮清空转写', () => {
    render(<Tool />)
    fireEvent.click(byTestId('start-stop'))
    act(() => instances[0]!.onresult!(makeResultEvent(['打开灯'], [])))
    expect(byTestId('clear-result')).toBeTruthy()
    fireEvent.click(byTestId('clear-result'))
    expect(byTestId('transcript').textContent).toContain('请说出命令词')
  })

  it('浏览器不支持语音识别 → 中文提示且按钮禁用', () => {
    vi.stubGlobal('SpeechRecognition', undefined)
    vi.stubGlobal('webkitSpeechRecognition', undefined)
    render(<Tool />)
    expect(byTestId('unsupported').textContent).toContain('不支持语音识别')
    expect((byTestId('start-stop') as HTMLButtonElement).disabled).toBe(true)
  })
})
