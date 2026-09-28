// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import type * as imageLib from '../../lib/image'

vi.mock('../../lib/image', async (importOriginal) => {
  const mod = (await importOriginal()) as typeof imageLib
  return { ...mod, downloadBlob: vi.fn() }
})

import { downloadBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const PNG_HEAD = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
const JPEG_HEAD = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 1, 2, 3, 4, 5, 6, 7])
const RANDOM_HEAD = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])

function headFile(name: string, type: string, head: Uint8Array, size = 1024) {
  // 真实文件头 + 填充至指定大小
  const body = new Uint8Array(Math.max(size, head.length))
  body.set(head)
  return new File([body], name, { type })
}

async function upload(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

beforeEach(() => {
  const writeText = vi.fn(async () => {})
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
})

describe('image-format 组件', () => {
  it('渲染投放区、文件输入与检测按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect(screen.getByTestId('detect')).toBeTruthy()
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('空选择点击检测显示错误', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('detect'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('请先选择文件')
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('选择后自动检测：混合一致/不一致/无法识别', async () => {
    render(<Tool />)
    await upload([
      headFile('photo.png', 'image/png', PNG_HEAD),
      headFile('fake.png', 'image/png', JPEG_HEAD),
      headFile('blob', '', RANDOM_HEAD),
    ])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())

    const row0 = screen.getByTestId('row-0')
    expect(row0.textContent).toContain('photo.png')
    expect(row0.textContent).toContain('png（image/png）')
    expect(row0.textContent).toContain('PNG')
    expect(row0.textContent).toContain('一致 ✓')

    const row1 = screen.getByTestId('row-1')
    expect(row1.textContent).toContain('fake.png')
    expect(row1.textContent).toContain('JPEG')
    expect(row1.textContent).toContain('扩展名与内容不符 ⚠')

    const row2 = screen.getByTestId('row-2')
    expect(row2.textContent).toContain('blob')
    expect(row2.textContent).toContain('无扩展名')
    expect(row2.textContent).toContain('无法识别 ✗')
  })

  it('有扩展名但无 MIME 时声明类型只写扩展名', async () => {
    render(<Tool />)
    await upload([headFile('mystery.png', '', PNG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('row-0')).toBeTruthy())
    const row = screen.getByTestId('row-0')
    expect(row.textContent).toContain('声明类型：png')
    expect(row.textContent).not.toContain('（')
  })

  it('jpg 扩展名与 jpeg 检测判为一致', async () => {
    render(<Tool />)
    await upload([headFile('a.jpg', 'image/jpeg', JPEG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('row-0').textContent).toContain('一致 ✓'))
  })

  it('超过 50 个文件显示错误', async () => {
    render(<Tool />)
    const many = Array.from({ length: 51 }, (_, i) =>
      headFile(`f${i}.png`, 'image/png', PNG_HEAD, 16),
    )
    await upload(many)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('批量上限 50'))
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('单文件超 50MB 显示错误', async () => {
    render(<Tool />)
    await upload([headFile('big.png', 'image/png', PNG_HEAD, 51 * 1024 * 1024)])
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('过大'))
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('复制报告写入剪贴板文本', async () => {
    render(<Tool />)
    await upload([headFile('photo.png', 'image/png', PNG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy-report'))
    await waitFor(() => expect(screen.getByTestId('copy-report').textContent).toContain('已复制'))
    const writeText = vi.mocked(navigator.clipboard.writeText)
    expect(writeText).toHaveBeenCalledTimes(1)
    const text = writeText.mock.calls[0][0]
    expect(text).toContain('图片格式检测报告')
    expect(text).toContain('photo.png')
    expect(text).toContain('一致 ✓')
  })

  it('剪贴板不可用时复制失败显示错误', async () => {
    const writeText = vi.fn(async () => {
      throw new Error('denied')
    })
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(<Tool />)
    await upload([headFile('photo.png', 'image/png', PNG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('copy-report'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('复制失败'))
  })

  it('下载报告调用 downloadBlob 且文件名为 txt', async () => {
    render(<Tool />)
    await upload([headFile('photo.png', 'image/png', PNG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-report'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('image-format-report.txt')
    expect(blob).toBeInstanceOf(Blob)
    const text = await (blob as Blob).text()
    expect(text).toContain('图片格式检测报告')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload([headFile('photo.png', 'image/png', PNG_HEAD)])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('拖拽上传触发检测', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [headFile('d.png', 'image/png', PNG_HEAD)] } })
    })
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
  })
})
