// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  isSupportedImageFile: vi.fn((f: File) => f.type.startsWith('image/')),
  readFileAsDataURL: vi.fn(async (f: File) => `data:${f.type || 'image/png'};base64,QUJD`),
}))

import { downloadBlob, isSupportedImageFile, readFileAsDataURL } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)
const mockIsSupported = vi.mocked(isSupportedImageFile)
const mockRead = vi.mocked(readFileAsDataURL)

afterEach(() => {
  cleanup()
})

function makeFile(name = 'photo.png', type = 'image/png') {
  return new File([new Uint8Array([1, 2, 3])], name, { type })
}

function makeBigFile() {
  const file = makeFile('big.png')
  // 不实际分配 50MB+ 内存，直接覆盖只读的 size
  Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
  return file
}

async function upload(files: File[]) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files } })
  })
}

/** 成功路径的剪贴板 mock，返回 writeText spy；调用方需在用例内删掉该属性 */
function mockClipboardSuccess() {
  const writeText = vi.fn(async (_text: string) => {})
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

function mockClipboardFailure() {
  const writeText = vi.fn(async (_text: string) => {
    throw new Error('denied')
  })
  Object.defineProperty(navigator, 'clipboard', {
    value: { writeText },
    configurable: true,
  })
  return writeText
}

beforeEach(() => {
  vi.clearAllMocks()
  Reflect.deleteProperty(navigator, 'clipboard')
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockIsSupported.mockImplementation((f: File) => f.type.startsWith('image/'))
  mockRead.mockImplementation(async (f: Blob) => `data:${f.type || 'image/png'};base64,QUJD`)
})

describe('image-to-base64 组件', () => {
  it('渲染投放区、多选文件输入与输出形式选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    const input = screen.getByTestId('file-input') as HTMLInputElement
    expect(input.multiple).toBe(true)
    expect(screen.getByTestId('opt-kind')).toBeTruthy()
  })

  it('上传图片后自动转换并显示结果（默认 DataURL）', async () => {
    render(<Tool />)
    await upload([makeFile()])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(screen.getByTestId('row-0')).toBeTruthy()
    const output = screen.getByTestId('output-0') as HTMLTextAreaElement
    expect(output.value).toBe('data:image/png;base64,QUJD')
    // 输出字符数：data:image/png;base64,（22）+ QUJD（4）= 26
    expect(screen.getByTestId('row-0').textContent).toContain('26')
    expect(screen.getByTestId('download-all')).toBeTruthy()
  })

  it('切换输出形式为纯 Base64，无需重新读文件', async () => {
    render(<Tool />)
    await upload([makeFile()])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(mockRead).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('opt-kind'), { target: { value: 'raw' } })
    await waitFor(() =>
      expect((screen.getByTestId('output-0') as HTMLTextAreaElement).value).toBe('QUJD'),
    )
    expect(mockRead).toHaveBeenCalledTimes(1)
    fireEvent.change(screen.getByTestId('opt-kind'), { target: { value: 'dataUrl' } })
    await waitFor(() =>
      expect((screen.getByTestId('output-0') as HTMLTextAreaElement).value).toContain('data:'),
    )
  })

  it('多文件批量转换显示多行', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    await waitFor(() => expect(screen.getByTestId('row-1')).toBeTruthy())
    expect(screen.getByTestId('row-0').textContent).toContain('a.png')
    expect(screen.getByTestId('row-1').textContent).toContain('b.jpg')
    expect((screen.getByTestId('output-1') as HTMLTextAreaElement).value).toBe(
      'data:image/jpeg;base64,QUJD',
    )
  })

  it('超过 20 个文件报错且不转换', async () => {
    render(<Tool />)
    const files = Array.from({ length: 21 }, (_, i) => makeFile(`f${i}.png`))
    await upload(files)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('20')
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('非图片文件报错', async () => {
    render(<Tool />)
    await upload([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    // 错误信息含文件名（翻译文案由协调员合并 i18n key 后生效，此处只断言结构）
    expect(screen.getByTestId('error').textContent).toContain('a.txt')
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('超大文件报错', async () => {
    render(<Tool />)
    await upload([makeBigFile()])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('单个文件读取失败计入错误，不影响其他文件', async () => {
    mockRead.mockRejectedValueOnce(new Error('读失败'))
    render(<Tool />)
    await upload([makeFile('bad.png'), makeFile('good.png')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('bad.png')
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(screen.getByTestId('row-0').textContent).toContain('good.png')
    expect(screen.queryByTestId('row-1')).toBeNull()
  })

  it('复制成功显示已复制', async () => {
    const writeText = mockClipboardSuccess()
    try {
      render(<Tool />)
      await upload([makeFile('a.png'), makeFile('b.png')])
      await waitFor(() => expect(screen.getByTestId('row-1')).toBeTruthy())
      fireEvent.click(screen.getByTestId('copy-0'))
      // 剪贴板被调用且传入当前输出形式的完整文本（按钮文案依赖 i18n key 合并，只断言行为）
      await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1))
      expect(writeText).toHaveBeenCalledWith('data:image/png;base64,QUJD')
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('复制失败降级提示手动复制', async () => {
    mockClipboardFailure()
    try {
      render(<Tool />)
      await upload([makeFile('a.png'), makeFile('b.png')])
      await waitFor(() => expect(screen.getByTestId('row-1')).toBeTruthy())
      fireEvent.click(screen.getByTestId('copy-0'))
      // 降级提示出现（文案依赖 i18n key 合并，用 testid 断言），且只影响当前行
      await waitFor(() => expect(screen.getByTestId('copy-error-0')).toBeTruthy())
      expect(screen.queryByTestId('copy-error-1')).toBeNull()
    } finally {
      Reflect.deleteProperty(navigator, 'clipboard')
    }
  })

  it('单项下载 .txt', async () => {
    render(<Tool />)
    await upload([makeFile('photo.png')])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-0'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0] as unknown as [Blob, string]
    expect(name).toBe('photo.txt')
    await expect(blob.text()).resolves.toBe('data:image/png;base64,QUJD')
  })

  it('全部下载合并为一个 txt', async () => {
    render(<Tool />)
    await upload([makeFile('a.png'), makeFile('b.jpg', 'image/jpeg')])
    await waitFor(() => expect(screen.getByTestId('row-1')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download-all'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [blob, name] = mockDownloadBlob.mock.calls[0] as unknown as [Blob, string]
    expect(name).toBe('base64-2-images.txt')
    const text = await blob.text()
    expect(text).toContain('// a.png')
    expect(text).toContain('// b.jpg')
    expect(text).toContain('data:image/jpeg;base64,QUJD')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload([makeFile('a.txt', 'text/plain')])
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    await upload([makeFile()])
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result-list')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('转换中显示处理状态', async () => {
    let resolve!: (value: string) => void
    mockRead.mockImplementationOnce(
      () =>
        new Promise<string>((r) => {
          resolve = r
        }),
    )
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [makeFile()] } })
    expect(screen.getByTestId('processing')).toBeTruthy()
    await act(async () => {
      resolve('data:image/png;base64,QUJD')
    })
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
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
    await waitFor(() => expect(screen.getByTestId('result-list')).toBeTruthy())
  })

  it('drop 时无文件不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mockRead).not.toHaveBeenCalled()
    expect(screen.queryByTestId('result-list')).toBeNull()
  })

  it('change 无文件不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockRead).not.toHaveBeenCalled()
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })
})
