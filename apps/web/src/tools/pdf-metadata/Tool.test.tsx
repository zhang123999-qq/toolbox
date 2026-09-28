// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MAX_FILE_SIZE } from './utils'

/** 可变的元数据 fixture：各用例按需改写，beforeEach 重置 */
const mockMeta: {
  title: string | undefined
  author: string | undefined
  subject: string | undefined
  keywords: string | undefined
  creator: string | undefined
  producer: string | undefined
  creationDate: Date | undefined
  modificationDate: Date | undefined
  pageCount: number
} = {
  title: '测试标题',
  author: '测试作者',
  subject: '测试主题',
  keywords: 'k1, k2',
  creator: 'CreatorApp',
  producer: 'ProducerApp',
  creationDate: new Date(2024, 0, 15, 10, 30, 0),
  modificationDate: new Date(2024, 5, 20, 12, 0, 0),
  pageCount: 7,
}

/** 记录写入 pdf-lib 的编辑值 */
const applied: { title?: string; author?: string; subject?: string; keywords?: string[] } = {}

function resetMockMeta() {
  mockMeta.title = '测试标题'
  mockMeta.author = '测试作者'
  mockMeta.subject = '测试主题'
  mockMeta.keywords = 'k1, k2'
  mockMeta.creator = 'CreatorApp'
  mockMeta.producer = 'ProducerApp'
  mockMeta.creationDate = new Date(2024, 0, 15, 10, 30, 0)
  mockMeta.modificationDate = new Date(2024, 5, 20, 12, 0, 0)
  mockMeta.pageCount = 7
  delete applied.title
  delete applied.author
  delete applied.subject
  delete applied.keywords
}

vi.mock('pdf-lib', () => {
  // 注意：factory 在模块导入时执行，只能经闭包延迟读取外部变量
  const doc = {
    getTitle: () => mockMeta.title,
    getAuthor: () => mockMeta.author,
    getSubject: () => mockMeta.subject,
    getKeywords: () => mockMeta.keywords,
    getCreator: () => mockMeta.creator,
    getProducer: () => mockMeta.producer,
    getCreationDate: () => mockMeta.creationDate,
    getModificationDate: () => mockMeta.modificationDate,
    getPageCount: () => mockMeta.pageCount,
    setTitle: (v: string) => {
      applied.title = v
    },
    setAuthor: (v: string) => {
      applied.author = v
    },
    setSubject: (v: string) => {
      applied.subject = v
    },
    setKeywords: (v: string[]) => {
      applied.keywords = v
    },
    save: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  }
  return { PDFDocument: { load: vi.fn(async () => doc) } }
})

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'
import Tool from './Tool'

const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

function makePdfFile(name = 'doc.pdf', size = 1024): File {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF-
  return new File([bytes], name, { type: 'application/pdf' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function inputValue(testId: string): string {
  return (screen.getByTestId(testId) as HTMLInputElement).value
}

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  resetMockMeta()
})

describe('pdf-metadata 组件', () => {
  it('渲染投放区；未加载时无元数据区/操作按钮', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.queryByTestId('meta-view')).toBeNull()
    expect(screen.queryByTestId('save')).toBeNull()
    expect(screen.queryByTestId('download')).toBeNull()
  })

  it('上传合法 PDF 后显示元数据与预填的编辑字段', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    expect(screen.getByTestId('meta-creator').textContent).toBe('CreatorApp')
    expect(screen.getByTestId('meta-producer').textContent).toBe('ProducerApp')
    expect(screen.getByTestId('meta-pageCount').textContent).toBe('7')
    expect(screen.getByTestId('meta-creationDate').textContent).toContain('2024')
    expect(inputValue('field-title')).toBe('测试标题')
    expect(inputValue('field-author')).toBe('测试作者')
    expect(inputValue('field-subject')).toBe('测试主题')
    expect(inputValue('field-keywords')).toBe('k1, k2')
    expect(screen.getByTestId('save')).toBeTruthy()
    expect(screen.getByTestId('clear')).toBeTruthy()
    expect(screen.getByTestId('reset')).toBeTruthy()
  })

  it('load 始终传 updateMetadata:false（不盖章）', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    expect(mockLoad).toHaveBeenCalledWith(expect.any(Uint8Array), { updateMetadata: false })
  })

  it('缺失字段回填为空输入', async () => {
    mockMeta.title = undefined
    mockMeta.author = undefined
    mockMeta.subject = undefined
    mockMeta.keywords = undefined
    mockMeta.creator = undefined
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    expect(inputValue('field-title')).toBe('')
    expect(inputValue('field-keywords')).toBe('')
  })

  it('上传非 PDF 显示错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([1, 2, 3, 4, 5])], 'a.txt', { type: 'text/plain' })
    await upload(bad)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('meta-view')).toBeNull()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    await upload(makePdfFile('big.pdf', MAX_FILE_SIZE + 1))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('文件过大'))
    expect(screen.queryByTestId('meta-view')).toBeNull()
  })

  it('加密 PDF 显示错误（专用分支）', async () => {
    const err = new Error('The file is encrypted')
    err.name = 'EncryptedPDFError'
    mockLoad.mockRejectedValueOnce(err)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('meta-view')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('加载失败显示错误文本', async () => {
    mockLoad.mockRejectedValueOnce(new Error('解码失败'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('解码失败'))
  })

  it('清空按钮清空四个可编辑输入', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    fireEvent.click(screen.getByTestId('clear'))
    expect(inputValue('field-title')).toBe('')
    expect(inputValue('field-author')).toBe('')
    expect(inputValue('field-subject')).toBe('')
    expect(inputValue('field-keywords')).toBe('')
  })

  it('保存把编辑值（含解析后的关键字）写入 pdf-lib 并生成结果', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    fireEvent.change(screen.getByTestId('field-title'), { target: { value: '新标题' } })
    await act(async () => {
      fireEvent.change(screen.getByTestId('field-keywords'), { target: { value: 'a, b,, c' } })
    })
    fireEvent.click(screen.getByTestId('save'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(applied.title).toBe('新标题')
    expect(applied.author).toBe('测试作者')
    expect(applied.keywords).toEqual(['a', 'b', 'c'])
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('保存失败显示错误', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    mockLoad.mockRejectedValueOnce(new Error('保存失败'))
    fireEvent.click(screen.getByTestId('save'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('保存失败'))
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('超长标题保存时被 schema 拒绝', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    await act(async () => {
      fireEvent.change(screen.getByTestId('field-title'), { target: { value: 'x'.repeat(501) } })
    })
    fireEvent.click(screen.getByTestId('save'))
    await waitFor(() => expect(screen.getByTestId('error').textContent).toContain('标题过长'))
  })

  it('下载按钮调用 downloadBlob，文件名带 -metadata 后缀', async () => {
    render(<Tool />)
    await upload(makePdfFile('report.pdf'))
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    fireEvent.click(screen.getByTestId('save'))
    await waitFor(() => expect(screen.getByTestId('download')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0] as [Blob, string]
    expect(name).toBe('report-metadata.pdf')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
    fireEvent.click(screen.getByTestId('save'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('meta-view')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('save')).toBeNull()
  })

  it('拖拽上传', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('meta-view')).toBeTruthy())
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
    expect(mockLoad).not.toHaveBeenCalled()
  })
})
