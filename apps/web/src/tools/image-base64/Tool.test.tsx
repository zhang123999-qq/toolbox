// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as SchemaModule from './schema'
import Tool from './Tool'

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  readFileAsDataURL: vi.fn(async () => 'data:image/png;base64,AAA'),
}))

/**
 * 把解码输入上限 mock 到 64 字符，避免单测构造 7000 万字符的真实大字符串；
 * 组件「超长→提示」分支逻辑与真实 schema 完全一致。
 */
vi.mock('./schema', async (importOriginal: () => Promise<typeof SchemaModule>) => {
  const actual = await importOriginal()
  const { z } = await import('zod')
  return {
    ...actual,
    MAX_BASE64_TEXT: 64,
    decodeInputSchema: z.object({
      base64Text: z.string().max(64, 'Base64 文本过长（上限 64 字符）'),
    }),
  }
})

import { downloadBlob, isSupportedImageFile, readFileAsDataURL } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockReadFileAsDataURL = vi.mocked(readFileAsDataURL)

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.png', type = 'image/png', size = 1024) {
  const blob = new Blob([new Uint8Array(size)], { type })
  return new File([blob], name, { type })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function stubClipboard(impl: (text: string) => Promise<void>) {
  const writeText = vi.fn(impl)
  Object.defineProperty(window.navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

beforeEach(() => {
  vi.clearAllMocks()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockReadFileAsDataURL.mockImplementation(async () => 'data:image/png;base64,AAA')
  stubClipboard(async () => {})
})

describe('image-base64 组件', () => {
  it('渲染模式切换与编码区', () => {
    render(<Tool />)
    expect(screen.getByTestId('mode-encode')).toBeTruthy()
    expect(screen.getByTestId('mode-decode')).toBeTruthy()
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-dataurl-full')).toBeTruthy()
    expect(screen.getByTestId('opt-dataurl-raw')).toBeTruthy()
    // 默认编码模式，解码输入区不可见
    expect(screen.queryByTestId('b64-input')).toBeNull()
  })

  it('切换到解码模式显示输入区', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    expect(screen.getByTestId('b64-input')).toBeTruthy()
    expect(screen.getByTestId('btn-convert')).toBeTruthy()
    expect(screen.queryByTestId('dropzone')).toBeNull()
    // 切回编码模式
    fireEvent.click(screen.getByTestId('mode-encode'))
    expect(screen.getByTestId('dropzone')).toBeTruthy()
  })

  it('上传图片后显示完整 DataURL 结果、预览与统计', async () => {
    render(<Tool />)
    await upload(makeFile())
    const output = screen.getByTestId('b64-output') as HTMLTextAreaElement
    expect(output.value).toBe('data:image/png;base64,AAA')
    expect(screen.getByTestId('preview')).toBeTruthy()
    expect(screen.getByTestId('encode-stats').textContent).toBe('共 25 个字符，约 18 字节')
    expect(screen.getByTestId('btn-copy')).toBeTruthy()
    expect(screen.getByTestId('btn-download-txt')).toBeTruthy()
  })

  it('处理中显示提示', async () => {
    let resolve!: (v: string) => void
    mockReadFileAsDataURL.mockImplementationOnce(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolve('data:image/png;base64,AAA')
    })
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
  })

  it('纯 Base64 选项去前缀并重新处理', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
    fireEvent.click(screen.getByTestId('opt-dataurl-raw'))
    await waitFor(() =>
      expect((screen.getByTestId('b64-output') as HTMLTextAreaElement).value).toBe('AAA'),
    )
    expect(screen.getByTestId('encode-stats').textContent).toBe('共 3 个字符，约 2 字节')
    // 切回完整 DataURL
    fireEvent.click(screen.getByTestId('opt-dataurl-full'))
    await waitFor(() =>
      expect((screen.getByTestId('b64-output') as HTMLTextAreaElement).value).toBe(
        'data:image/png;base64,AAA',
      ),
    )
  })

  it('无文件时切换输出形式不处理', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-dataurl-raw'))
    expect(screen.queryByTestId('b64-output')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('复制成功显示已复制', async () => {
    const writeText = stubClipboard(async () => {})
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
    fireEvent.click(screen.getByTestId('btn-copy'))
    await waitFor(() => expect(writeText).toHaveBeenCalledWith('data:image/png;base64,AAA'))
    expect(screen.getByText('已复制')).toBeTruthy()
  })

  it('复制失败提示手动复制', async () => {
    stubClipboard(async () => {
      throw new Error('denied')
    })
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
    fireEvent.click(screen.getByTestId('btn-copy'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('手动复制')
  })

  it('下载 txt 调用 downloadBlob', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
    fireEvent.click(screen.getByTestId('btn-download-txt'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('image-base64.txt')
    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('text/plain;charset=utf-8')
    await expect(blob.text()).resolves.toBe('data:image/png;base64,AAA')
  })

  it('上传非图片显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('不支持的图片格式')
    expect(screen.queryByTestId('b64-output')).toBeNull()
  })

  it('文件超限显示错误', async () => {
    render(<Tool />)
    const big = { size: 50 * 1024 * 1024 + 1, name: 'big.png', type: 'image/png' } as File
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [big] } })
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
  })

  it('文件读取失败显示错误', async () => {
    mockReadFileAsDataURL.mockRejectedValueOnce(new Error('文件读取失败'))
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件读取失败')
  })

  it('重置清空编码结果', async () => {
    render(<Tool />)
    await upload(makeFile())
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('b64-output')).toBeNull()
    expect(screen.getByTestId('dropzone').textContent).toContain('点击选择图片')
  })

  it('模式切换清空错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    fireEvent.click(screen.getByTestId('mode-decode'))
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makeFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('b64-output')).toBeTruthy())
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockReadFileAsDataURL).not.toHaveBeenCalled()
  })

  it('解码：合法 DataURL 显示预览与下载', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), {
      target: { value: 'data:image/png;base64,iVBORw0KGgo=' },
    })
    fireEvent.click(screen.getByTestId('btn-convert'))
    const img = screen.getByTestId('preview-img') as HTMLImageElement
    expect(img.src).toBe('data:image/png;base64,iVBORw0KGgo=')
    const link = screen.getByTestId('btn-download-img') as HTMLAnchorElement
    expect(link.getAttribute('href')).toBe('data:image/png;base64,iVBORw0KGgo=')
    expect(link.getAttribute('download')).toBe('base64-image.png')
    expect(screen.getByTestId('decode-stats').textContent).toBe('共 12 个字符，约 9 字节')
  })

  it('解码：无前缀默认按 PNG 处理', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), { target: { value: 'iVBORw0KGgo=' } })
    fireEvent.click(screen.getByTestId('btn-convert'))
    const img = screen.getByTestId('preview-img') as HTMLImageElement
    expect(img.src).toBe('data:image/png;base64,iVBORw0KGgo=')
    const link = screen.getByTestId('btn-download-img') as HTMLAnchorElement
    expect(link.getAttribute('download')).toBe('base64-image.png')
  })

  it('解码：jpeg 前缀下载文件名为 jpg', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), {
      target: { value: 'data:image/jpeg;base64,/9j/' },
    })
    fireEvent.click(screen.getByTestId('btn-convert'))
    const link = screen.getByTestId('btn-download-img') as HTMLAnchorElement
    expect(link.getAttribute('download')).toBe('base64-image.jpg')
  })

  it('解码：空白符容忍', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), {
      target: { value: '  data:image/png;base64,iVBOR\nw0KGgo=\t' },
    })
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('preview-img')).toBeTruthy()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('解码：非法 Base64 报错', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), { target: { value: '!!!' } })
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('error').textContent).toContain('Base64 非法')
    expect(screen.queryByTestId('preview-img')).toBeNull()
  })

  it('解码：长度非 4 倍数报错', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), { target: { value: 'ABC' } })
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('error').textContent).toContain('Base64 非法')
  })

  it('解码：非图片 mime 报错', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.change(screen.getByTestId('b64-input'), {
      target: { value: 'data:text/plain;base64,TWFu' },
    })
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('error').textContent).toContain('不支持的 DataURL 类型')
  })

  it('解码：空输入报错', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('error').textContent).toContain('输入为空')
  })

  it('解码：超长输入由 schema 限长并提示', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('mode-decode'))
    // schema mock 上限 64 字符
    fireEvent.change(screen.getByTestId('b64-input'), { target: { value: 'A'.repeat(65) } })
    fireEvent.click(screen.getByTestId('btn-convert'))
    expect(screen.getByTestId('error').textContent).toContain('上限 7000 万字符')
    expect(screen.queryByTestId('preview-img')).toBeNull()
  })
})
