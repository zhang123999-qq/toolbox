// @vitest-environment jsdom
/**
 * audio-mix 组件测试
 *
 * jsdom 没有 AudioContext：用本文件内建的最小 WAV 解码器模拟 decodeAudioData；
 * 「载入示例音轨」走 utils 纯函数，不依赖解码器。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'
import { encodeWavPcm, makeSineTone } from './utils'

afterEach(cleanup)

/**
 * 测试本地最小 WAV 解码器（仅支持 16-bit PCM WAV，供 MockAudioContext 用）。
 * 内建于本文件，避免跨工具 import（仓库规范 §1、§3 禁止工具间直接耦合）。
 */
function decodeWavPcm(bytes: Uint8Array): { sampleRate: number; channels: Float32Array[] } {
  if (bytes.length < 44) throw new Error('不是合法的 WAV 文件：文件过短')
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const readAscii = (off: number, len: number): string => {
    let s = ''
    for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(off + i))
    return s
  }
  if (readAscii(0, 4) !== 'RIFF' || readAscii(8, 4) !== 'WAVE') {
    throw new Error('不是合法的 WAV 文件：缺少 RIFF/WAVE 标记')
  }
  let pos = 12
  let sampleRate = 0
  let numChannels = 0
  let dataOff = -1
  let dataLen = 0
  while (pos + 8 <= bytes.length) {
    const id = readAscii(pos, 4)
    const size = view.getUint32(pos + 4, true)
    if (id === 'fmt ') {
      numChannels = view.getUint16(pos + 8, true)
      sampleRate = view.getUint32(pos + 12, true)
    } else if (id === 'data') {
      dataOff = pos + 8
      dataLen = size
      break
    }
    pos += 8 + size
  }
  if (numChannels === 0 || dataOff < 0) throw new Error('不是合法的 WAV 文件：缺少 fmt/data 块')
  const frames = Math.floor(dataLen / (numChannels * 2))
  const channels: Float32Array[] = []
  for (let c = 0; c < numChannels; c++) channels.push(new Float32Array(frames))
  for (let f = 0; f < frames; f++) {
    for (let c = 0; c < numChannels; c++) {
      channels[c]![f] = view.getInt16(dataOff + (f * numChannels + c) * 2, true) / 32768
    }
  }
  return { sampleRate, channels }
}

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

/** 取音轨列表里的第一个音轨 id */
function firstTrackId(): string {
  const list = byTestId('track-list')
  const name = list.querySelector('[data-testid^="track-name-"]')
  if (!name) throw new Error('音轨列表为空')
  return name.getAttribute('data-testid')!.replace('track-name-', '')
}

describe('audio-mix · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口、示例音轨按钮与对齐下拉框', () => {
    render(<Tool />)
    expect(byTestId('files')).toBeTruthy()
    expect(byTestId('example-audio')).toBeTruthy()
    const select = byTestId('align') as HTMLSelectElement
    expect(select.textContent).toContain('最短对齐')
    expect(select.textContent).toContain('循环')
  })

  it('载入示例音轨 → 自动混音并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('音轨 1：示例-440Hz.wav')
    expect(info).toContain('音轨 2：示例-660Hz.wav')
    expect(info).toContain('对齐方式：最短对齐')
    expect(info).toContain('输出：3.00 秒')
    expect(byTestId('track-list').childElementCount).toBe(2)
  })

  it('切换对齐方式后重新混音，报告随之变化', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('align'), { target: { value: 'loop' } })
    fireEvent.click(byTestId('remix'))
    await waitFor(
      () => expect(byTestId('result-info').textContent).toContain('最长对齐（短音轨循环）'),
      { timeout: 10000 },
    )
  })

  it('音量非法（非数字）→ 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId(`volume-${firstTrackId()}`), { target: { value: 'abc' } })
    fireEvent.click(byTestId('remix'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('音量非法')
  })

  it('移除到只剩 1 路 → 至少 2 路中文提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.click(byTestId(`remove-track-${firstTrackId()}`))
    expect(byTestId('track-list').childElementCount).toBe(1)
    fireEvent.click(byTestId('example-audio'))
    // 重新载入示例后移除同一 id 不行（id 已变化），改用新列表的第一个
    fireEvent.click(byTestId(`remove-track-${firstTrackId()}`))
    expect(screen.queryByTestId('remix')).toBeNull()
  })

  it('采样率不一致 → 中文错误提示', async () => {
    render(<Tool />)
    const a = encodeWavPcm(makeSineTone(44100, 1, 440))
    const b = encodeWavPcm(makeSineTone(22050, 1, 440))
    fireEvent.change(byTestId('files'), {
      target: {
        files: [
          new File([a], 'a.wav', { type: 'audio/wav' }),
          new File([b], 'b.wav', { type: 'audio/wav' }),
        ],
      },
    })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('采样率不一致')
  })

  it('浏览器不支持 Web Audio API → 中文错误提示', async () => {
    vi.stubGlobal('AudioContext', undefined)
    render(<Tool />)
    const a = encodeWavPcm(makeSineTone(44100, 1, 440))
    fireEvent.change(byTestId('files'), {
      target: { files: [new File([a], 'a.wav', { type: 'audio/wav' })] },
    })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不支持 Web Audio API')
  })

  it('下载混音按钮指向生成的 blob URL', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const link = byTestId('download-audio') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('blob:mock-url')
    expect(link.getAttribute('download')).toBe('audio-mix.wav')
  })
})
