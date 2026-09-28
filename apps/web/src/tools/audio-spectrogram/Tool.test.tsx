// @vitest-environment jsdom
/**
 * audio-spectrogram 组件测试
 *
 * jsdom 没有 AudioContext / Canvas：用本文件内建的最小 WAV 解码器模拟
 * decodeAudioData，canvas 2d 上下文用桩对象代替。
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

/** 假 2d 上下文：只实现绘制频谱图用到的三个方法 */
function makeFakeCtx() {
  return {
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
    putImageData: vi.fn(),
  }
}

function stubBrowserApis(ctxImpl: () => unknown = makeFakeCtx): void {
  vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext)
  Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
    value: vi.fn(ctxImpl),
    configurable: true,
  })
  Object.defineProperty(HTMLCanvasElement.prototype, 'toDataURL', {
    value: vi.fn(() => 'data:image/png;base64,AAA'),
    configurable: true,
  })
}

beforeEach(() => stubBrowserApis())

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('audio-spectrogram · Tool', () => {
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

  it('载入示例音频 → 频谱图画布出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 15000 })
    const canvas = byTestId('spectrogram-canvas') as HTMLCanvasElement
    expect(canvas.className).not.toContain('hidden')
    expect(canvas.width).toBeGreaterThan(0)
    expect(canvas.height).toBe(512)
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('窗长：1024 采样点')
    expect(info).toContain('频率分辨率')
    const link = byTestId('download-image') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('data:image/png;base64,AAA')
    expect(link.getAttribute('download')).toMatch(/-spectrogram\.png$/)
  })

  it('选择文件上传 → 解码并绘制频谱图', async () => {
    render(<Tool />)
    const wav = encodeWavPcm(makeSineTone(22050, 2, 330))
    const file = new File([wav], 'upload.wav', { type: 'audio/wav' })
    fireEvent.change(byTestId('file'), { target: { files: [file] } })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('file-name').textContent).toContain('upload.wav')
    expect((byTestId('spectrogram-canvas') as HTMLCanvasElement).height).toBe(512)
  })

  it('修改窗长后重新处理，报告随之变化', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 15000 })
    fireEvent.change(byTestId('option-windowSize'), { target: { value: '512' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('result-info').textContent).toContain('窗长：512 采样点'), {
      timeout: 15000,
    })
    expect((byTestId('spectrogram-canvas') as HTMLCanvasElement).height).toBe(256)
  })

  it('窗长非法 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 15000 })
    fireEvent.change(byTestId('option-windowSize'), { target: { value: '100' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('error').textContent).toContain('窗长非法')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('浏览器不支持 Web Audio API → 中文错误提示', async () => {
    vi.stubGlobal('AudioContext', undefined)
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('error').textContent).toContain('不支持 Web Audio API')
  })

  it('Canvas 不可用 → 中文错误提示', async () => {
    stubBrowserApis(() => null)
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('error').textContent).toContain('不支持 Canvas')
  })
})
