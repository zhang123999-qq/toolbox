// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('svgo', () => ({
  optimize: vi.fn((text: string) => ({ data: text })),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { optimize } from 'svgo'
import { downloadBlob } from '../../lib/image'

const mockOptimize = vi.mocked(optimize)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

const SVG_TEXT =
  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><!-- 注释 --><circle cx="50" cy="50" r="40"/></svg>'

function makeFile(name = 'icon.svg', type = 'image/svg+xml', content = SVG_TEXT) {
  return new File([content], name, { type })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockOptimize.mockImplementation((text: string) => ({ data: text }))
})

describe('svg-optimize-img 组件', () => {
  it('渲染投放区与选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-multipass')).toBeTruthy()
    expect(screen.getByTestId('opt-pretty')).toBeTruthy()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    const input = zone.querySelector('input[type="file"]')
    expect(input).toBeTruthy()
    expect(input?.getAttribute('accept')).toBe('.svg,image/svg+xml')
  })

  it('上传合法 SVG 后显示结果、统计与下载', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('preview')).toBeTruthy()
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
    // svgo 以多轮 + 非格式化默认配置调用
    expect(mockOptimize).toHaveBeenCalledWith(SVG_TEXT, {
      multipass: true,
      js2svg: { pretty: false },
    })
    // 投放区显示已选文件名
    expect(screen.getByTestId('dropzone').textContent).toContain('icon.svg')
  })

  it('处理中显示提示', async () => {
    let resolveText!: (v: string) => void
    const gate = new Promise<string>((res) => {
      resolveText = res
    })
    const file = makeFile()
    vi.spyOn(file, 'text').mockImplementation(() => gate)
    render(<Tool />)
    fireEvent.change(screen.getByTestId('file-input'), { target: { files: [file] } })
    expect(await screen.findByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolveText(SVG_TEXT)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('上传非 SVG 文件显示错误', async () => {
    render(<Tool />)
    await upload(new File(['hello'], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').getAttribute('role')).toBe('alert')
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('扩展名非 .svg 且 MIME 非 svg 时报错', async () => {
    render(<Tool />)
    await upload(new File([SVG_TEXT], 'a.png', { type: 'image/png' }))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    const big = new File([new Uint8Array(MAX_FILE_SIZE + 1)], 'big.svg', {
      type: 'image/svg+xml',
    })
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('文件读取失败显示错误', async () => {
    const file = makeFile()
    vi.spyOn(file, 'text').mockRejectedValueOnce(new Error('读取失败'))
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('读取失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('空文件显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('empty.svg', 'image/svg+xml', ''))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件为空'))
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('内容不是有效 SVG 显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('x.svg', 'image/svg+xml', '<html><body>hi</body></html>'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('不是有效的 SVG'))
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('svgo 失败显示错误', async () => {
    mockOptimize.mockImplementationOnce(() => {
      throw new Error('svgo 解析失败')
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('svgo 解析失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('选项变更（无文件时）不触发处理', async () => {
    render(<Tool />)
    await act(async () => {
      // checkbox 用 click 触发 onChange（fireEvent.change 不触发）
      fireEvent.click(screen.getByTestId('opt-pretty'))
    })
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('多轮优化开关切换后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockOptimize.mock.calls.length
    // 关 → off
    await act(async () => {
      fireEvent.click(screen.getByTestId('opt-multipass'))
    })
    await waitFor(() => expect(mockOptimize.mock.calls.length).toBeGreaterThan(calls))
    expect(mockOptimize.mock.calls[mockOptimize.mock.calls.length - 1][1]).toEqual({
      multipass: false,
      js2svg: { pretty: false },
    })
    // 再开 → on
    const calls2 = mockOptimize.mock.calls.length
    await act(async () => {
      fireEvent.click(screen.getByTestId('opt-multipass'))
    })
    await waitFor(() => expect(mockOptimize.mock.calls.length).toBeGreaterThan(calls2))
    expect(mockOptimize.mock.calls[mockOptimize.mock.calls.length - 1][1]).toEqual({
      multipass: true,
      js2svg: { pretty: false },
    })
  })

  it('格式化输出开关切换后重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const calls = mockOptimize.mock.calls.length
    // 开 → pretty: true
    await act(async () => {
      fireEvent.click(screen.getByTestId('opt-pretty'))
    })
    await waitFor(() => expect(mockOptimize.mock.calls.length).toBeGreaterThan(calls))
    expect(mockOptimize.mock.calls[mockOptimize.mock.calls.length - 1][1]).toEqual({
      multipass: true,
      js2svg: { pretty: true },
    })
    // 再关 → pretty: false
    const calls2 = mockOptimize.mock.calls.length
    await act(async () => {
      fireEvent.click(screen.getByTestId('opt-pretty'))
    })
    await waitFor(() => expect(mockOptimize.mock.calls.length).toBeGreaterThan(calls2))
    expect(mockOptimize.mock.calls[mockOptimize.mock.calls.length - 1][1]).toEqual({
      multipass: true,
      js2svg: { pretty: false },
    })
  })

  it('下载按钮调用 downloadBlob 且文件名为 -optimized.svg', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('icon-optimized.svg')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } })
    })
    expect(mockOptimize).not.toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    const file = makeFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('拖拽空 dataTransfer 不处理', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: null } })
    })
    expect(mockOptimize).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result')).toBeNull()
  })
})
