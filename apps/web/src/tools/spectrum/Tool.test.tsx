// @vitest-environment jsdom
/**
 * spectrum 组件测试
 *
 * jsdom 的 canvas.getContext 返回 null：按需 stub 成 mock 2d 上下文；
 * AudioContext 用最小 mock，经 utils 的 WAV 解码器模拟 decodeAudioData。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

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
/**
 * 测试本地最小 WAV 编码器 + 正弦波发生器（供本文件构造上传用例）。
 * 内建于本文件，避免跨工具 import（仓库规范 §1、§3 禁止工具间直接耦合）。
 */
function makeSineTone(
  sampleRate: number,
  seconds: number,
  freqHz: number,
): { sampleRate: number; channels: Float32Array[] } {
  const frames = Math.max(1, Math.floor(sampleRate * seconds))
  const data = new Float32Array(frames)
  for (let i = 0; i < frames; i++) data[i] = Math.sin((2 * Math.PI * freqHz * i) / sampleRate)
  return { sampleRate, channels: [data] }
}

function encodeWavPcm(audio: {
  sampleRate: number
  channels: readonly Float32Array[]
}): Uint8Array<ArrayBuffer> {
  const numChannels = audio.channels.length
  const numFrames = audio.channels[0]?.length ?? 0
  const dataSize = numFrames * numChannels * 2
  const out = new Uint8Array(44 + dataSize)
  const view = new DataView(out.buffer)
  const writeAscii = (off: number, s: string): void => {
    for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i))
  }
  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, numChannels, true)
  view.setUint32(24, audio.sampleRate, true)
  view.setUint32(28, audio.sampleRate * numChannels * 2, true)
  view.setUint16(32, numChannels * 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, dataSize, true)
  let p = 44
  for (let f = 0; f < numFrames; f++) {
    for (let c = 0; c < numChannels; c++) {
      const v = Math.max(-1, Math.min(1, audio.channels[c]![f]!))
      view.setInt16(p, Math.round(v * 32767), true)
      p += 2
    }
  }
  return out
}

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

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

/** mock 2d 上下文：记录绘制调用 */
function mockCanvas2d() {
  return {
    clearRect: vi.fn(),
    fillRect: vi.fn(),
    fillStyle: '',
  }
}

let ctx2d = mockCanvas2d()

function stubBrowserApis(canvasOk: boolean): void {
  vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
  ctx2d = mockCanvas2d()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() =>
    canvasOk ? (ctx2d as unknown as CanvasRenderingContext2D) : null,
  )
}

beforeEach(() => stubBrowserApis(true))
afterEach(() => vi.restoreAllMocks())

function makeTestFile(): File {
  const wav = encodeWavPcm(makeSineTone(44100, 2, 440))
  return new File([wav], 'test.wav', { type: 'audio/wav' })
}

describe('spectrum · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供两种模式入口与画布', () => {
    render(<Tool />)
    expect(byTestId('mode-file')).toBeTruthy()
    expect(byTestId('mode-mic')).toBeTruthy()
    expect(byTestId('spectrum-canvas')).toBeTruthy()
  })

  it('载入示例音频 → 绘制频谱并显示峰值', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('peak-info')).toBeTruthy(), { timeout: 10000 })
    expect(ctx2d.fillRect.mock.calls.length).toBeGreaterThan(0)
    // 示例含 440Hz，峰值频率应在附近
    const peak = parseFloat(byTestId('peak-info').textContent!.match(/[\d.]+/)![0]!)
    expect(peak).toBeGreaterThan(300)
    expect(peak).toBeLessThan(600)
  })

  it('选择文件上传 → 解码并绘制频谱', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeTestFile()] } })
    await waitFor(() => expect(byTestId('peak-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('test.wav')
    expect(ctx2d.fillRect.mock.calls.length).toBeGreaterThan(0)
  })

  it('FFT 点数非法 → 中文错误提示', () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-fftSize'), { target: { value: '1000' } })
    fireEvent.click(byTestId('example-audio'))
    expect(byTestId('error').textContent).toContain('FFT 点数须为')
  })

  it('浏览器不支持 Canvas → 中文错误提示', async () => {
    stubBrowserApis(false)
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('不支持 Canvas')
  })

  it('麦克风模式无采集能力 → 中文错误提示', async () => {
    Object.defineProperty(globalThis.navigator, 'mediaDevices', {
      value: undefined,
      configurable: true,
    })
    render(<Tool />)
    fireEvent.click(byTestId('mode-mic'))
    fireEvent.click(byTestId('mic-start'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy())
    expect(byTestId('error').textContent).toContain('不支持麦克风采集')
  })
})
