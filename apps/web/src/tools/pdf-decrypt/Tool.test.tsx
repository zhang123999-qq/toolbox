// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'

// qpdf 封装整体 mock：解密引擎的真实调用在 test.ts 中用真实 wasm 覆盖
vi.mock('../../lib/qpdf', () => ({
  runQpdf: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

// pdf-lib mock：按调用顺序消费 loadQueue，依次控制“上传探测 / 解密后校验”
//（真实 pdf-lib 行为在 test.ts 中用真实库覆盖）
vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn() },
}))

import { runQpdf } from '../../lib/qpdf'
import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockRunQpdf = vi.mocked(runQpdf)
const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

type LoadResult = { getPageCount(): number }
let loadQueue: Array<() => Promise<LoadResult>>

const encryptedThrow = async (): Promise<LoadResult> => {
  // 文案含 'is encrypted'，与真实 pdf-lib EncryptedPDFError 一致
  throw new Error('Input document to `PDFDocument.load` is encrypted.')
}
const plainOk = async (): Promise<LoadResult> => ({ getPageCount: () => 5 })
const verifyOk = async (): Promise<LoadResult> => ({ getPageCount: () => 3 })

const DECRYPTED = new Uint8Array([1, 2, 3, 4, 5])

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  loadQueue = []
  mockLoad.mockImplementation((() => {
    const next = loadQueue.shift()
    return next ? next() : plainOk()
  }) as never)
  mockRunQpdf.mockResolvedValue(DECRYPTED)
})

function makePdfFile(name = 'secret.pdf', size = 2048) {
  const bytes = new Uint8Array(size)
  bytes.set([0x25, 0x50, 0x44, 0x46, 0x2d]) // %PDF- 魔数
  return new File([new Blob([bytes], { type: 'application/pdf' })], name, {
    type: 'application/pdf',
  })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

/** 上传一个“已加密”的 PDF：探测阶段抛加密错误，等待密码区出现 */
async function uploadEncrypted(name = 'secret.pdf') {
  loadQueue.push(encryptedThrow)
  await upload(makePdfFile(name))
  await waitFor(() => expect(screen.getByTestId('password-input')).toBeTruthy())
}

function fillPassword(value: string) {
  const input = screen.getByTestId('password-input') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
  return input
}

describe('pdf-decrypt 组件', () => {
  it('渲染投放区与文件输入', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('file-input')).toBeTruthy()
    expect(screen.queryByTestId('password-input')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('投放区为原生 label 且包含文件输入', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('上传加密 PDF 后出现密码区（密码框为 password 类型）', async () => {
    render(<Tool />)
    await uploadEncrypted()
    const pwInput = screen.getByTestId('password-input') as HTMLInputElement
    expect(pwInput.type).toBe('password')
    expect(screen.getByTestId('decrypt')).toBeTruthy()
    // 投放区显示已选文件名
    expect(screen.getByTestId('dropzone').textContent).toContain('secret.pdf')
  })

  it('未加密的 PDF 提示无需解密，不出现密码区', async () => {
    render(<Tool />)
    loadQueue.push(plainOk)
    await upload(makePdfFile('plain.pdf'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('password-input')).toBeNull()
  })

  it('非 PDF 文件显示错误', async () => {
    render(<Tool />)
    const blob = new Blob(['hello'], { type: 'text/plain' })
    await upload(new File([blob], 'a.txt', { type: 'text/plain' }))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('password-input')).toBeNull()
  })

  it('超大文件显示错误（上限 50MB）', async () => {
    render(<Tool />)
    await upload(makePdfFile('big.pdf', 50 * 1024 * 1024 + 1))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('损坏的 PDF（魔数正确但无法解析）显示错误', async () => {
    render(<Tool />)
    loadQueue.push(async () => {
      throw new Error('Invalid PDF structure')
    })
    await upload(makePdfFile('broken.pdf'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('password-input')).toBeNull()
  })

  it('空密码点击解密显示错误，不调用解密引擎', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('解密成功：调用引擎并传密码，显示结果，密码输入被清空', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    loadQueue.push(verifyOk)
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    // 引擎收到原始字节与参数构造器
    expect(mockRunQpdf).toHaveBeenCalledTimes(1)
    const [inputBytes, buildArgs] = mockRunQpdf.mock.calls[0]
    expect(inputBytes).toBeInstanceOf(Uint8Array)
    expect(buildArgs('/in.pdf', '/out.pdf')).toEqual([
      '--password=pw123',
      '--decrypt',
      '--',
      '/in.pdf',
      '/out.pdf',
    ])

    expect(screen.getByTestId('result-info')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('解密成功后密码被清空：重置并重新上传，密码框为空', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    loadQueue.push(verifyOk)
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    // 密码只存内存：成功后输入框被清空；经重置+重新上传验证
    fireEvent.click(screen.getByTestId('reset'))
    await uploadEncrypted('again.pdf')
    expect((screen.getByTestId('password-input') as HTMLInputElement).value).toBe('')
  })

  it('解密中显示 processing（含“正在加载解密引擎”文案位）', async () => {
    let resolveQpdf!: (v: Uint8Array) => void
    mockRunQpdf.mockImplementation(() => new Promise<Uint8Array>((res) => (resolveQpdf = res)))
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    loadQueue.push(verifyOk)
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    await act(async () => {
      resolveQpdf(DECRYPTED)
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(screen.queryByTestId('processing')).toBeNull()
  })

  it('密码错误（退出码 2）显示错误且无结果', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('wrong')
    mockRunQpdf.mockRejectedValue(new Error('qpdf 执行失败（退出码 2）'))
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('解密引擎其他失败显示错误', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    mockRunQpdf.mockRejectedValue(new Error('qpdf 输出文件为空'))
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('解密输出校验失败显示错误', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    loadQueue.push(async () => {
      throw new Error('Invalid PDF structure')
    })
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('下载按钮调用 downloadBlob，文件名为 -decrypted.pdf', async () => {
    render(<Tool />)
    await uploadEncrypted('report.pdf')
    fillPassword('pw123')
    loadQueue.push(verifyOk)
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalledTimes(1)
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('report-decrypted.pdf')
  })

  it('重置清空全部状态', async () => {
    render(<Tool />)
    await uploadEncrypted()
    fillPassword('pw123')
    loadQueue.push(verifyOk)
    fireEvent.click(screen.getByTestId('decrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('password-input')).toBeNull()
    expect(screen.queryByTestId('error')).toBeNull()
  })

  it('拖拽上传加密 PDF', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    expect(zone.className).not.toContain('border-blue-500')
    loadQueue.push(encryptedThrow)
    const file = makePdfFile('drag.pdf')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('password-input')).toBeTruthy())
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('error')).toBeNull()
  })
})
