// @vitest-environment jsdom
/**
 * audio-visualizer 组件测试
 *
 * WebAudio / Canvas 均用 mock：验证渲染 / 样式选项 / 示例音频播放 /
 * 暂停继续 / 无 WebAudio 时的中文报错。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'

afterEach(cleanup)

class MockAnalyser {
  fftSize = 2048
  frequencyBinCount = 1024
  smoothingTimeConstant = 0.8
  connect(): void {}
  disconnect(): void {}
  getByteFrequencyData(arr: Uint8Array): void {
    arr.fill(128)
  }
  getByteTimeDomainData(arr: Uint8Array): void {
    arr.fill(128)
  }
}

class MockSource {
  buffer: unknown = null
  connect(): void {}
  disconnect(): void {}
  start(): void {}
  stop(): void {}
}

class MockAudioContext {
  state = 'running'
  destination = {}
  async decodeAudioData(): Promise<unknown> {
    return {
      sampleRate: 8000,
      numberOfChannels: 1,
      duration: 4,
      getChannelData: () => new Float32Array(32000),
    }
  }
  createAnalyser(): MockAnalyser {
    return new MockAnalyser()
  }
  createBufferSource(): MockSource {
    return new MockSource()
  }
  async resume(): Promise<void> {
    this.state = 'running'
  }
  async suspend(): Promise<void> {
    this.state = 'suspended'
  }
  async close(): Promise<void> {}
}

function makeCtx2d(): Record<string, unknown> {
  const fns = [
    'clearRect',
    'fillRect',
    'beginPath',
    'moveTo',
    'lineTo',
    'stroke',
    'save',
    'restore',
    'closePath',
    'arc',
    'fill',
  ] as const
  const ctx: Record<string, unknown> = { fillStyle: '', strokeStyle: '', lineWidth: 1 }
  for (const name of fns) ctx[name] = vi.fn()
  return ctx
}

let ctx2d: Record<string, unknown>

beforeEach(() => {
  ctx2d = makeCtx2d()
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx2d as unknown as CanvasRenderingContext2D,
  )
  vi.stubGlobal('AudioContext', MockAudioContext)
})

import Tool from './Tool'

describe('audio-visualizer 组件', () => {
  it('渲染音频选择、示例按钮、样式下拉与画布', () => {
    render(<Tool />)
    expect(screen.getByTestId('audio-input')).toBeTruthy()
    expect(screen.getByTestId('example-audio')).toBeTruthy()
    expect(screen.getByTestId('visual-canvas')).toBeTruthy()
    const select = screen.getByTestId('style-select') as HTMLSelectElement
    expect(select.options.length).toBe(3)
    expect(select.options[0]?.textContent).toContain('柱状频谱')
    // 未加载音频时暂停按钮禁用
    expect((screen.getByTestId('play-pause') as HTMLButtonElement).disabled).toBe(true)
  })

  it('载入示例音频后开始播放并绘制', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example-audio'))
    expect((await screen.findByTestId('file-name')).textContent).toContain('示例音频.wav')
    const toggle = screen.getByTestId('play-pause')
    expect((toggle as HTMLButtonElement).disabled).toBe(false)
    expect(toggle.textContent).toContain('暂停')
    // 绘制循环被触发
    await waitFor(() => {
      expect(ctx2d['clearRect'] as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
  })

  it('切换样式下拉后绘制仍继续', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example-audio'))
    await screen.findByTestId('file-name')
    fireEvent.change(screen.getByTestId('style-select'), { target: { value: 'wave' } })
    await waitFor(() => {
      expect(ctx2d['clearRect'] as ReturnType<typeof vi.fn>).toHaveBeenCalled()
    })
  })

  it('暂停 / 继续切换按钮文案', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example-audio'))
    await screen.findByTestId('file-name')
    const toggle = screen.getByTestId('play-pause')
    fireEvent.click(toggle)
    expect(toggle.textContent).toContain('继续')
    fireEvent.click(toggle)
    expect(toggle.textContent).toContain('暂停')
  })

  it('上传音频文件后开始播放', async () => {
    render(<Tool />)
    const file = new File(['fake-audio'], 'song.mp3', { type: 'audio/mpeg' })
    fireEvent.change(screen.getByTestId('audio-input'), { target: { files: [file] } })
    expect((await screen.findByTestId('file-name')).textContent).toContain('song.mp3')
  })

  it('不支持 WebAudio 时给出中文报错', async () => {
    vi.stubGlobal('AudioContext', undefined)
    render(<Tool />)
    fireEvent.click(screen.getByTestId('example-audio'))
    expect((await screen.findByTestId('error')).textContent).toContain('不支持 WebAudio')
  })
})
