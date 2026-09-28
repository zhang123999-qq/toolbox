// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

// pdf-lib 整体 mock：Tool 与 utils 共用同一份假实现，便于断言旋转行为
const mocks = vi.hoisted(() => {
  const setRotation = vi.fn()
  const getPage = vi.fn((_index: number) => ({
    getRotation: () => ({ angle: 0 }),
    setRotation,
  }))
  const save = vi.fn(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  const load = vi.fn()
  return { setRotation, getPage, save, load }
})

vi.mock('pdf-lib', () => ({
  PDFDocument: {
    load: (...args: unknown[]) => mocks.load(...args),
  },
  // 测试中断言角度数值，degrees 取恒等实现
  degrees: (angle: number) => angle,
  EncryptedPDFError: class EncryptedPDFError extends Error {
    constructor() {
      super('Input document to `PDFDocument.load` is encrypted.')
      this.name = 'EncryptedPDFError'
    }
  },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { EncryptedPDFError } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 1024): File {
  const bytes = new Uint8Array(size)
  // %PDF- 魔数头
  bytes[0] = 0x25
  bytes[1] = 0x50
  bytes[2] = 0x44
  bytes[3] = 0x46
  bytes[4] = 0x2d
  return new File([bytes], name, { type: 'application/pdf' })
}

function makeTextFile(): File {
  return new File(['hello world'], 'a.txt', { type: 'text/plain' })
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
  mocks.getPage.mockImplementation((_index: number) => ({
    getRotation: () => ({ angle: 0 }),
    setRotation: mocks.setRotation,
  }))
  mocks.save.mockImplementation(async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]))
  mocks.load.mockImplementation(async () => ({
    getPageCount: () => 3,
    getPage: mocks.getPage,
    save: mocks.save,
  }))
})

describe('pdf-rotate 组件', () => {
  it('渲染投放区与选项，初始无结果', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-angle')).toBeTruthy()
    expect(screen.getByTestId('opt-scope-all')).toBeTruthy()
    expect(screen.getByTestId('opt-scope-pages')).toBeTruthy()
    expect(screen.queryByTestId('opt-pages')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('上传合法 PDF 后显示结果与下载按钮', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    expect(screen.getByTestId('page-count')).toBeTruthy()
    expect(mocks.load).toHaveBeenCalled()
    // 默认 90°，3 页全部旋转
    expect(mocks.getPage).toHaveBeenCalledTimes(3)
    expect(mocks.setRotation).toHaveBeenCalledWith(90)
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    await upload(makeTextFile())
    await waitFor(() =>
      expect(screen.getByTestId('error').textContent).toContain('不是有效的 PDF 文件'),
    )
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('文件过大报错', async () => {
    render(<Tool />)
    const file = makePdfFile()
    Object.defineProperty(file, 'size', { value: MAX_FILE_SIZE + 1 })
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('加密 PDF 明确报错', async () => {
    mocks.load.mockRejectedValueOnce(new EncryptedPDFError())
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('已加密'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('PDF 加载失败（非加密）透出原始错误', async () => {
    mocks.load.mockRejectedValueOnce(new Error('文件损坏'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件损坏'))
  })

  it('页码输入仅在指定页面时显示', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-scope-pages'))
    expect(screen.getByTestId('opt-pages')).toBeTruthy()
    fireEvent.click(screen.getByTestId('opt-scope-all'))
    expect(screen.queryByTestId('opt-pages')).toBeNull()
  })

  it('指定页面范围非法时报错', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-scope-pages'))
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: 'abc' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('页码无效'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('指定页面只旋转所选页', async () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('opt-scope-pages'))
    fireEvent.change(screen.getByTestId('opt-pages'), { target: { value: '1,3' } })
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(mocks.setRotation).toHaveBeenCalledTimes(2)
    expect(mocks.getPage).toHaveBeenCalledWith(0)
    expect(mocks.getPage).toHaveBeenCalledWith(2)
    expect(mocks.getPage).not.toHaveBeenCalledWith(1)
  })

  it('角度切换后重新处理', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.change(screen.getByTestId('opt-angle'), { target: { value: '180' } })
    await waitFor(() => expect(mocks.setRotation).toHaveBeenCalledWith(180))
  })

  it('选项变更无文件时不处理', () => {
    render(<Tool />)
    fireEvent.change(screen.getByTestId('opt-angle'), { target: { value: '270' } })
    expect(mocks.load).not.toHaveBeenCalled()
  })

  it('下载按钮调用 downloadBlob 且文件名带 -rotated.pdf', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('report-rotated.pdf')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.getByTestId('reset')).toBeTruthy()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
    expect(screen.queryByTestId('page-count')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('拖拽空文件不处理', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.drop(zone, { dataTransfer: { files: null } })
    expect(mocks.load).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
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
    expect(mocks.load).not.toHaveBeenCalled()
  })
})
