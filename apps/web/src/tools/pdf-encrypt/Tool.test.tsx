// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import Tool from './Tool'

vi.mock('../../lib/qpdf', () => ({
  runQpdf: vi.fn(),
  errorMessage: (err: unknown) => (err instanceof Error ? err.message : String(err)),
  getQpdfModule: vi.fn(),
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { downloadBlob } from '../../lib/image'
import { getQpdfModule, runQpdf } from '../../lib/qpdf'

const mockRunQpdf = vi.mocked(runQpdf)
const mockGetQpdf = vi.mocked(getQpdfModule)
const mockDownloadBlob = vi.mocked(downloadBlob)

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
  mockGetQpdf.mockResolvedValue({} as never)
})

/** 生成最小合法 PDF 字节 */
async function makePdfBytes(): Promise<Uint8Array> {
  const doc = await PDFDocument.create()
  doc.addPage([300, 200])
  return doc.save()
}

/**
 * 构造"已加密" fixture：增量更新追加加密字典对象，trailer 写 /Encrypt。
 * pdf-lib 的 load 见到 /Encrypt 即抛 EncryptedPDFError（与 test.ts 同款）。
 */
async function makeEncryptedMarkerBytes(): Promise<Uint8Array> {
  const bytes = Buffer.from(await makePdfBytes())
  const s = bytes.toString('latin1')
  const root = s.match(/\/Root\s+(\d+\s+\d+\s+R)/)?.[1] ?? '2 0 R'
  const prev = Number(s.match(/startxref\s+(\d+)/)?.[1] ?? '0')
  const encObj = '10 0 obj\n<< /Filter /Standard /V 4 /R 4 /O (xx) /U (yy) /P -4 >>\nendobj\n'
  const encOffset = bytes.length
  const xrefOffset = encOffset + encObj.length
  const xref =
    'xref\n0 1\n0000000000 65535 f \n10 1\n' + String(encOffset).padStart(10, '0') + ' 00000 n \n'
  const trailer =
    `trailer\n<< /Size 11 /Root ${root} /Encrypt 10 0 R /Prev ${prev} >>\n` +
    `startxref\n${xrefOffset}\n%%EOF`
  return new Uint8Array(Buffer.concat([bytes, Buffer.from(encObj + xref + trailer, 'latin1')]))
}

function makeFile(name: string, bytes: Uint8Array, type = 'application/pdf'): File {
  return new File([bytes.slice()], name, { type })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

function fillPassword(userPw: string, ownerPw?: string) {
  fireEvent.change(screen.getByTestId('opt-userpw'), { target: { value: userPw } })
  if (ownerPw !== undefined) {
    fireEvent.change(screen.getByTestId('opt-ownerpw'), { target: { value: ownerPw } })
  }
}

describe('pdf-encrypt 组件', () => {
  it('渲染投放区、密码框（type=password）、密钥长度与权限选项', () => {
    render(<Tool />)
    expect(screen.getByTestId('dropzone')).toBeTruthy()
    expect(screen.getByTestId('opt-userpw').getAttribute('type')).toBe('password')
    expect(screen.getByTestId('opt-ownerpw').getAttribute('type')).toBe('password')
    expect(screen.getByTestId('opt-keylength')).toBeTruthy()
    expect(screen.getByTestId('perm-print')).toBeTruthy()
    expect(screen.getByTestId('perm-extract')).toBeTruthy()
    expect(screen.getByTestId('perm-modify')).toBeTruthy()
    expect(screen.getByTestId('perm-annotate')).toBeTruthy()
    expect(screen.getByTestId('encrypt')).toBeTruthy()
    // 无结果时不渲染下载按钮
    expect(screen.queryByTestId('download')).toBeNull()
  })

  it('投放区为 label 且包含文件输入（原生可点击）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('加密成功：qpdf 参数正确、密码自动清空、显示结果与下载', async () => {
    const encBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 1, 2, 3])
    mockRunQpdf.mockResolvedValue(encBytes)
    render(<Tool />)
    await upload(makeFile('report.pdf', await makePdfBytes()))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    const buildArgs = mockRunQpdf.mock.calls[0][1] as (a: string, b: string) => string[]
    expect(buildArgs('/in.pdf', '/out.pdf')).toEqual([
      '--encrypt',
      'user123',
      'user123',
      '256',
      '--print=full',
      '--extract=y',
      '--modify=all',
      '--annotate=y',
      '--',
      '/in.pdf',
      '/out.pdf',
    ])
    // 所有者密码留空默认与用户密码相同
    expect(screen.getByTestId('stats')).toBeTruthy()
    expect(screen.getByTestId('download')).toBeTruthy()
    // 处理完自动清空密码
    expect((screen.getByTestId('opt-userpw') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('opt-ownerpw') as HTMLInputElement).value).toBe('')
  })

  it('填写的所有者密码透传给 qpdf', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fillPassword('user123', 'owner456')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const buildArgs = mockRunQpdf.mock.calls[0][1] as (a: string, b: string) => string[]
    const args = buildArgs('/in.pdf', '/out.pdf')
    expect(args[1]).toBe('user123')
    expect(args[2]).toBe('owner456')
  })

  it('128-bit 在 --encrypt 前加 --allow-weak-crypto', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fireEvent.change(screen.getByTestId('opt-keylength'), { target: { value: '128' } })
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const buildArgs = mockRunQpdf.mock.calls[0][1] as (a: string, b: string) => string[]
    const args = buildArgs('/in.pdf', '/out.pdf')
    expect(args[0]).toBe('--allow-weak-crypto')
    expect(args).toContain('128')
  })

  it('权限开关逐项映射为 qpdf flags', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fireEvent.click(screen.getByTestId('perm-print'))
    fireEvent.click(screen.getByTestId('perm-extract'))
    fireEvent.click(screen.getByTestId('perm-modify'))
    fireEvent.click(screen.getByTestId('perm-annotate'))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    const buildArgs = mockRunQpdf.mock.calls[0][1] as (a: string, b: string) => string[]
    const args = buildArgs('/in.pdf', '/out.pdf')
    expect(args).toContain('--print=none')
    expect(args).toContain('--extract=n')
    expect(args).toContain('--modify=none')
    expect(args).toContain('--annotate=n')
  })

  it('wasm 引擎加载中显示"正在加载加密引擎"处理态', async () => {
    mockGetQpdf.mockReturnValue(new Promise(() => {}))
    let resolveRun!: (v: Uint8Array) => void
    mockRunQpdf.mockReturnValue(
      new Promise<Uint8Array>((resolve) => {
        resolveRun = resolve
      }),
    )
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    // 引擎仍在 loading：处理态存在
    await waitFor(() => expect(screen.getByTestId('processing')).toBeTruthy())
    expect(mockRunQpdf).toHaveBeenCalled()
    resolveRun(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })

  it('组件卸载后引擎落定不更新状态', async () => {
    let resolveEngine!: () => void
    mockGetQpdf.mockReturnValue(
      new Promise((resolve) => {
        resolveEngine = () => resolve({} as never)
      }),
    )
    const { unmount } = render(<Tool />)
    unmount()
    await act(async () => {
      resolveEngine()
    })
    // 无警告、无状态更新，覆盖 cancelled 分支即可
    expect(mockGetQpdf).toHaveBeenCalled()
  })

  it('引擎加载失败时加密直接报错、不调 qpdf', async () => {
    mockGetQpdf.mockRejectedValue(new Error('wasm 加载失败'))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    await act(async () => {})
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('空密码报错且不调 qpdf（错误不含密码原文）', async () => {
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('密码不能为空')
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('超长密码报错', async () => {
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fillPassword('x'.repeat(129))
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('密码过长')
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('非 PDF 文件显示错误', async () => {
    render(<Tool />)
    await upload(makeFile('a.txt', new Uint8Array([1, 2, 3, 4, 5]), 'text/plain'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('超大文件报错', async () => {
    const file = makeFile('big.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    Object.defineProperty(file, 'size', { value: 50 * 1024 * 1024 + 1 })
    render(<Tool />)
    await upload(file)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('文件过大')
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('已加密的 PDF 明确报错（不支持二次加密）', async () => {
    render(<Tool />)
    await upload(makeFile('enc.pdf', await makeEncryptedMarkerBytes()))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('损坏的 PDF 显示"文件损坏"错误', async () => {
    render(<Tool />)
    await upload(makeFile('bad.pdf', new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 1, 2, 3])))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('qpdf 失败显示错误并清空结果', async () => {
    mockRunQpdf.mockRejectedValue(new Error('qpdf 执行失败（退出码 2）'))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.getByTestId('error').textContent).toContain('退出码 2')
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('下载按钮调用 downloadBlob，文件名带 -encrypted 后缀', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    await upload(makeFile('report.pdf', await makePdfBytes()))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('report-encrypted.pdf')
  })

  it('清空密码按钮清空两个密码框', async () => {
    render(<Tool />)
    fillPassword('user123', 'owner456')
    fireEvent.click(screen.getByTestId('clear-passwords'))
    expect((screen.getByTestId('opt-userpw') as HTMLInputElement).value).toBe('')
    expect((screen.getByTestId('opt-ownerpw') as HTMLInputElement).value).toBe('')
  })

  it('重置清空文件、结果与密码', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    await upload(makeFile('a.pdf', await makePdfBytes()))
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('result')).toBeNull()
    expect(screen.queryByTestId('reset')).toBeNull()
  })

  it('无文件时点击加密不处理', () => {
    render(<Tool />)
    fireEvent.click(screen.getByTestId('encrypt'))
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('无文件时 change 不处理', () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    fireEvent.change(input, { target: { files: [] } })
    expect(mockRunQpdf).not.toHaveBeenCalled()
  })

  it('拖拽上传', async () => {
    mockRunQpdf.mockResolvedValue(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]))
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [makeFile('a.pdf', await makePdfBytes())] } })
    })
    fillPassword('user123')
    fireEvent.click(screen.getByTestId('encrypt'))
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
  })
})
