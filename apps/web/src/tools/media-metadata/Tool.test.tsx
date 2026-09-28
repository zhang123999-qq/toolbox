// @vitest-environment jsdom
/**
 * media-metadata 组件测试
 *
 * 用纯函数构造的 WAV / MP3 / MP4 文件头做输入；
 * 浏览器兜底（audio/video 元素）用可控的 mock 元素覆盖。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

let probedDuration: number | null = null
let probeShouldFail = false

function stubBrowserApis(): void {
  probedDuration = null
  probeShouldFail = false
  const originalCreateElement = document.createElement.bind(document)
  const mockCreateElement = (tagName: string): HTMLElement => {
    const el = originalCreateElement(tagName as 'audio')
    if (tagName === 'audio' || tagName === 'video') {
      const media = el as HTMLMediaElement
      Object.defineProperty(media, 'duration', { value: 0, configurable: true })
      Object.defineProperty(media, 'src', {
        set(_value: string) {
          setTimeout(() => {
            if (probeShouldFail) {
              media.onerror?.(new Event('error'))
            } else if (probedDuration !== null) {
              Object.defineProperty(media, 'duration', {
                value: probedDuration,
                configurable: true,
              })
              media.onloadedmetadata?.(new Event('loadedmetadata'))
            } else {
              media.onerror?.(new Event('error'))
            }
          }, 0)
        },
        configurable: true,
      })
    }
    return el
  }
  vi.spyOn(document, 'createElement').mockImplementation(
    mockCreateElement as typeof document.createElement,
  )
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

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function tag(buf: Uint8Array, offset: number, text: string): void {
  for (let i = 0; i < text.length; i++) buf[offset + i] = text.charCodeAt(i)
}

function craftWavFile(): File {
  const out = new Uint8Array(48)
  const v = new DataView(out.buffer)
  tag(out, 0, 'RIFF')
  v.setUint32(4, 40, true)
  tag(out, 8, 'WAVE')
  tag(out, 12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(22, 1, true)
  v.setUint32(24, 8000, true)
  v.setUint16(34, 16, true)
  tag(out, 36, 'data')
  v.setUint32(40, 4, true)
  return new File([out], 'tone.wav', { type: 'audio/wav' })
}

function craftMp3File(): File {
  const out = new Uint8Array([0xff, 0xfb, 0x90, 0x00])
  return new File([out], 'song.mp3', { type: 'audio/mpeg' })
}

function craftMp4File(): File {
  const out = new Uint8Array(24)
  const v = new DataView(out.buffer)
  v.setUint32(0, 24)
  tag(out, 4, 'ftyp')
  tag(out, 8, 'isom')
  return new File([out], 'clip.mp4', { type: 'video/mp4' })
}

function selectFile(file: File): void {
  fireEvent.change(byTestId('file'), { target: { files: [file] } })
}

describe('media-metadata · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect(byTestId('file')).toBeTruthy()
  })

  it('WAV 文件 → 纯 JS 解析出采样率 / 声道 / 时长', async () => {
    render(<Tool />)
    selectFile(craftWavFile())
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(byTestId('file-name').textContent).toContain('tone.wav')
    expect(info).toContain('WAV')
    expect(info).toContain('8000 Hz')
    expect(info).toContain('声道数：1')
    expect(info).toContain('时长：')
  })

  it('MP3 文件 → 帧头解析 + 浏览器兜底时长', async () => {
    probedDuration = 180.5
    render(<Tool />)
    selectFile(craftMp3File())
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('MP3')
    expect(info).toContain('128 kbps')
    expect(info).toContain('时长：180.50 秒')
  })

  it('MP4 文件 → 主品牌 + 兜底时长', async () => {
    probedDuration = 12
    render(<Tool />)
    selectFile(craftMp4File())
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('MP4')
    expect(info).toContain('主品牌：isom')
    expect(info).toContain('时长：12.00 秒')
  })

  it('兜底探测失败 → 时长显示未知', async () => {
    probeShouldFail = true
    render(<Tool />)
    selectFile(craftMp3File())
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('时长：未知')
  })

  it('未知格式 → 中文错误提示', async () => {
    render(<Tool />)
    selectFile(
      new File([new Uint8Array([1, 2, 3, 4])], 'x.bin', { type: 'application/octet-stream' }),
    )
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('无法识别的文件格式')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })
})
