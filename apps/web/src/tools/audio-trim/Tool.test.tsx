// @vitest-environment jsdom
/**
 * audio-trim 组件测试
 *
 * jsdom 没有 AudioContext：用本文件内建的最小 WAV 解码器模拟 decodeAudioData，
 * 浏览器不支持分支通过卸掉全局 AudioContext 覆盖。
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

/** 用 utils 纯函数造一个全静音 WAV 文件 */
function makeSilentFile(name: string): File {
  const wav = encodeWavPcm({ sampleRate: 8000, channels: [new Float32Array(8000)] })
  return new File([wav], name, { type: 'audio/wav' })
}

/** 造一个无静音的测试 WAV 文件 */
function makeToneFile(name: string): File {
  const wav = encodeWavPcm(makeSineTone(8000, 2, 330))
  return new File([wav], name, { type: 'audio/wav' })
}

describe('audio-trim · Tool', () => {
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

  it('载入示例音频 → 自动裁掉首尾静音并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('裁掉首部静音：1.00 秒')
    expect(info).toContain('裁掉尾部静音：1.00 秒')
    expect(info).toContain('输出时长：2.00 秒')
  })

  it('调大最小时长 → 短静音被保留', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-minSilenceSec'), { target: { value: '5' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(
      () => expect(byTestId('result-info').textContent).toContain('未达最小时长，予以保留'),
      { timeout: 10000 },
    )
    expect(byTestId('result-info').textContent).toContain('输出时长：4.00 秒')
  })

  it('上传全静音音频 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeSilentFile('silent.wav')] } })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('音频全部为静音')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('上传无静音音频 → 原样输出', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeToneFile('tone.wav')] } })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('输出时长：2.00 秒')
  })

  it('静音阈值非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-thresholdDb'), { target: { value: '-5' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('静音阈值非法')
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
    expect(link.getAttribute('download')).toMatch(/-trimmed\.wav$/)
  })
})
