// @vitest-environment jsdom
/**
 * audio-format 组件测试
 *
 * 本工具只读文件头魔数，不解码：File.slice 在 jsdom 下可用，无需模拟 AudioContext。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

describe('audio-format · Tool', () => {
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

  it('载入示例音频 → 识别为 WAV 音频', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('example-audio'))
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    const info = byTestId('result-info').textContent ?? ''
    expect(info).toContain('识别结果：WAV 音频')
    expect(info).toContain('RIFF/WAVE')
  })

  it('上传 MP3 头（ID3）→ 识别为 MP3 音频', async () => {
    render(<Tool />)
    const head = new Uint8Array([0x49, 0x44, 0x33, 0x04, 0, 0, 0, 0, 0, 0, 0, 0])
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([head], 'song.mp3', { type: 'audio/mpeg' })] },
    })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('识别结果：MP3 音频')
  })

  it('上传未知魔数 → 未知格式中文说明', async () => {
    render(<Tool />)
    const head = new Uint8Array([0x5a, 0x5a, 0x5a, 0x5a, 1, 2, 3, 4])
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([head], 'mystery.bin')] },
    })
    await waitFor(() => expect(byTestId('result-info')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('result-info').textContent).toContain('识别结果：未知格式')
  })

  it('空文件 → 中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [new File([], 'empty.wav', { type: 'audio/wav' })] },
    })
    await waitFor(() => expect(byTestId('error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('error').textContent).toContain('文件为空')
    expect(byTestId('error').getAttribute('role')).toBe('alert')
  })
})
