// @vitest-environment jsdom
/**
 * audio-pitch 组件测试
 *
 * jsdom 没有 AudioContext：用 utils 的纯 WAV 解码器模拟 decodeAudioData，
 * 浏览器不支持分支通过卸掉全局 AudioContext 覆盖。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'
import { decodeWavPcm, encodeWavPcm, makeSineTone } from './utils'

afterEach(cleanup)

/** 最小 AudioBuffer 形状：Tool 只用 sampleRate / numberOfChannels / getChannelData */
class MockAudioContext {
  async decodeAudioData(data: ArrayBuffer): Promise<unknown> {
    const { sampleRate, channels } = decodeWavPcm(new Uint8Array(data))
    return {
      sampleRate,
      numberOfChannels: channels.length,
      getChannelData: (c: number) => channels[c]!.slice(),
    }
  }
  async close(): Promise<void> {}
}

function stubBrowserApis(): void {
  vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
  Object.defineProperty(window.URL, 'createObjectURL', {
    value: vi.fn(() => 'blob:mock-url'),
    configurable: true,
  })
  Object.defineProperty(window.URL, 'revokeObjectURL', {
    value: vi.fn(),
    configurable: true,
  })
}

beforeEach(stubBrowserApis)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

/** 用 utils 纯函数造一个 2 秒测试 WAV 文件 */
function makeTestFile(name: string, seconds = 2): File {
  const wav = encodeWavPcm(makeSineTone(44100, seconds, 330))
  return new File([wav], name, { type: 'audio/wav' })
}

describe('audio-pitch · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口与示例音频按钮', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('example-audio')).toBeTruthy()
  })

  it('载入示例音频 → 播放器出现并显示变调报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('示例-440Hz正弦波.wav')
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('变调量：+3 半音')
    expect(info).toContain('输出时长')
  })

  it('选择文件上传 → 解码并自动处理', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile('upload.wav')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('upload.wav')
    expect(byTestId('result-info').textContent).toContain('变调量：+3 半音')
  })

  it('改为 -12 半音后重新处理，输出时长加倍', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-semitones'), { target: { value: '-12' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(
      () => expect(byTestId('result-info').textContent).toContain('输出时长：8.00 秒'),
      { timeout: 10000 },
    )
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('download')).toMatch(/-pitch-12st\.wav$/)
  })

  it('半音超出范围 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-semitones'), { target: { value: '24' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('变调量非法')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('浏览器不支持 Web Audio API → 中文错误提示', async () => {
    vi.stubGlobal('AudioContext', undefined)
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不支持 Web Audio API')
  })

  it('下载音频按钮指向生成的 blob URL', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toMatch(/-pitch\+3st\.wav$/)
  })
})
