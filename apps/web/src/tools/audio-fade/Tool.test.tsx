// @vitest-environment jsdom
/**
 * audio-fade 组件测试
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

describe('audio-fade · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口、示例音频按钮与曲线下拉框', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
    expect(byTestId('example-audio')).toBeTruthy()
    const select = byTestId('curve') as HTMLSelectElement
    expect(select.value).toBe('linear')
    expect(select.textContent).toContain('线性')
    expect(select.textContent).toContain('指数')
  })

  it('载入示例音频 → 淡入淡出后播放器出现并显示报告', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('淡入：1.00 秒')
    expect(info).toContain('淡出：1.00 秒')
    expect(info).toContain('曲线：线性')
    expect(info).toContain('输出时长：4.00 秒')
  })

  it('切换为指数曲线后重新处理，报告随之变化', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('curve'), { target: { value: 'exponential' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('result-info').textContent).toContain('曲线：指数'), {
      timeout: 10000,
    })
  })

  it('淡入时长非法（非数字）→ 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-fadeIn'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('淡入时长必须是数字')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })

  it('淡入+淡出超过音频时长 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    fireEvent.change(byTestId('option-fadeIn'), { target: { value: '3' } })
    fireEvent.change(byTestId('option-fadeOut'), { target: { value: '3' } })
    fireEvent.click(byTestId('reprocess'))
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('超过音频时长')
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
    expect(link.getAttribute('download')).toMatch(/-fade\.wav$/)
  })

  it('用 makeSineTone 造文件上传也能处理', async () => {
    render(<Tool />)
    const wav = encodeWavPcm(makeSineTone(22050, 2, 330))
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([wav], 'upload.wav', { type: 'audio/wav' })] },
    })
    await waitFor(() => expect(byTestId('player')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('file-name').textContent).toContain('upload.wav')
  })
})
