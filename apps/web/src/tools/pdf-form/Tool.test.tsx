// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Tool from './Tool'
import { MAX_FILE_SIZE } from './utils'

vi.mock('pdf-lib', () => ({
  PDFDocument: { load: vi.fn() },
}))

vi.mock('../../lib/image', () => ({
  downloadBlob: vi.fn(),
  formatBytes: (n: number) => `${n} B`,
}))

import { PDFDocument } from 'pdf-lib'
import { downloadBlob } from '../../lib/image'

const mockLoad = vi.mocked(PDFDocument.load)
const mockDownloadBlob = vi.mocked(downloadBlob)

/* ---- 假字段：constructor 名与 pdf-lib 真实类一致，供 utils 的 detectFieldKind 识别 ---- */
class PDFTextField {
  setText = vi.fn()
  constructor(
    public opts: {
      name?: string
      maxLength?: number
      multiline?: boolean
      readOnly?: boolean
    } = {},
  ) {}
  getName() {
    return this.opts.name ?? ''
  }
  isReadOnly() {
    return !!this.opts.readOnly
  }
  getMaxLength() {
    return this.opts.maxLength
  }
  isMultiline() {
    return !!this.opts.multiline
  }
}

class PDFCheckBox {
  check = vi.fn()
  uncheck = vi.fn()
  constructor(public opts: { name?: string; readOnly?: boolean } = {}) {}
  getName() {
    return this.opts.name ?? ''
  }
  isReadOnly() {
    return !!this.opts.readOnly
  }
}

class PDFRadioGroup {
  select = vi.fn()
  clear = vi.fn()
  constructor(public opts: { name?: string; options?: string[] } = {}) {}
  getName() {
    return this.opts.name ?? ''
  }
  isReadOnly() {
    return false
  }
  getOptions() {
    return this.opts.options ?? []
  }
}

class PDFDropdown {
  select = vi.fn()
  clear = vi.fn()
  constructor(public opts: { name?: string; options?: string[]; multi?: boolean } = {}) {}
  getName() {
    return this.opts.name ?? ''
  }
  isReadOnly() {
    return false
  }
  getOptions() {
    return this.opts.options ?? []
  }
  isMultiselect() {
    return !!this.opts.multi
  }
}

class PDFButton {
  constructor(public opts: { name?: string } = {}) {}
  getName() {
    return this.opts.name ?? ''
  }
  isReadOnly() {
    return false
  }
}

/** 全类型字段各一个：文本 / 多行文本 / 复选框 / 单选组 / 下拉 / 多选下拉 / 只读 / 不支持 / 无名 / 空下拉 */
function allKindsFields() {
  return [
    new PDFTextField({ name: 'fullName', maxLength: 8 }),
    new PDFTextField({ name: 'bio', multiline: true }),
    new PDFCheckBox({ name: 'agree' }),
    new PDFRadioGroup({ name: 'gender', options: ['male', 'female'] }),
    new PDFDropdown({ name: 'country', options: ['CN', 'US'] }),
    new PDFDropdown({ name: 'langs', options: ['zh', 'en'], multi: true }),
    new PDFTextField({ name: 'code', readOnly: true }),
    new PDFButton({ name: 'submitBtn' }),
    new PDFTextField({}),
    new PDFDropdown({ name: 'emptyList', options: [] }),
  ]
}

function makeDoc(fields: unknown[], flatten = vi.fn()) {
  const formApi = { getFields: () => fields, flatten }
  return {
    getForm: () => formApi,
    save: async () => new Uint8Array([0x25, 0x50, 0x44, 0x46]),
  }
}

const PDF_BYTES = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37])

function makePdfFile(name = 'form.pdf', bytes: Uint8Array = PDF_BYTES) {
  return new File([bytes.slice()], name, { type: 'application/pdf' })
}

async function upload(file: File) {
  const input = screen.getByTestId('file-input') as HTMLInputElement
  await act(async () => {
    fireEvent.change(input, { target: { files: [file] } })
  })
}

async function uploadFields() {
  mockLoad.mockResolvedValueOnce(makeDoc(allKindsFields()) as never)
  await upload(makePdfFile())
  await waitFor(() => expect(screen.getByTestId('form-section')).toBeTruthy())
}

afterEach(() => {
  cleanup()
})

beforeEach(() => {
  vi.clearAllMocks()
  URL.createObjectURL = vi.fn(() => 'blob:mock-url')
  URL.revokeObjectURL = vi.fn()
})

describe('pdf-form 组件', () => {
  it('渲染投放区（label 包裹文件输入）', () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    expect(zone.tagName).toBe('LABEL')
    expect(zone.querySelector('input[type="file"]')).toBeTruthy()
  })

  it('无文件时 change 不处理', async () => {
    render(<Tool />)
    const input = screen.getByTestId('file-input') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { files: [] } })
    })
    expect(mockLoad).not.toHaveBeenCalled()
    expect(screen.queryByTestId('form-section')).toBeNull()
  })

  it('非 PDF 文件显示错误', async () => {
    render(<Tool />)
    await upload(makePdfFile('a.txt', new Uint8Array([1, 2, 3, 4, 5, 6])))
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('form-section')).toBeNull()
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('超大文件显示错误', async () => {
    render(<Tool />)
    const big = {
      name: 'big.pdf',
      size: MAX_FILE_SIZE + 1,
      arrayBuffer: async () => new ArrayBuffer(0),
    } as unknown as File
    await upload(big)
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(mockLoad).not.toHaveBeenCalled()
  })

  it('加密 PDF 显示加密错误', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Input document to `PDFDocument.load` is encrypted'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('form-section')).toBeNull()
  })

  it('损坏 PDF 显示无效错误', async () => {
    mockLoad.mockRejectedValueOnce(new Error('Invalid PDF structure'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
  })

  it('全类型字段渲染对应编辑器', async () => {
    render(<Tool />)
    await uploadFields()
    // 10 个字段
    expect(screen.getAllByTestId(/^field-\d+$/)).toHaveLength(10)
    // 文本框（单行 input + 多行 textarea）
    const textInput = screen.getByTestId('field-input-0') as HTMLInputElement
    expect(textInput.tagName).toBe('INPUT')
    expect(textInput.type).toBe('text')
    expect((screen.getByTestId('field-input-1') as HTMLElement).tagName).toBe('TEXTAREA')
    // 复选框
    expect((screen.getByTestId('field-input-2') as HTMLInputElement).type).toBe('checkbox')
    // 单选组两个选项
    expect(screen.getAllByTestId('field-input-3')).toHaveLength(2)
    // 下拉框（单选）
    expect((screen.getByTestId('field-input-4') as HTMLElement).tagName).toBe('SELECT')
    expect((screen.getByTestId('field-input-4') as HTMLSelectElement).multiple).toBe(false)
    // 多选下拉
    expect((screen.getByTestId('field-input-5') as HTMLSelectElement).multiple).toBe(true)
    // 只读字段禁用 + 徽标
    expect((screen.getByTestId('field-input-6') as HTMLInputElement).disabled).toBe(true)
    expect(screen.getByTestId('field-readonly-6')).toBeTruthy()
    // 不支持的按钮字段给提示
    expect(screen.getByTestId('field-unsupported-7')).toBeTruthy()
    // 无名字段用索引兜底
    expect(screen.getByTestId('field-name-8').textContent).toContain('#9')
    // 空下拉框不崩溃，给明确提示
    expect(screen.getByTestId('field-no-options-9')).toBeTruthy()
  })

  it('无表单字段的 PDF 显示空状态', async () => {
    mockLoad.mockResolvedValueOnce(makeDoc([]) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('no-fields')).toBeTruthy())
    expect(screen.queryByTestId('export')).toBeNull()
  })

  it('超长文本截断并提示', async () => {
    render(<Tool />)
    await uploadFields()
    const input = screen.getByTestId('field-input-0') as HTMLInputElement
    await act(async () => {
      fireEvent.change(input, { target: { value: 'hello world, too long' } })
    })
    expect(input.value).toBe('hello wo')
    expect(screen.getByTestId('field-truncated-0')).toBeTruthy()
  })

  it('填写各字段后导出：值正确应用，默认不拼合', async () => {
    const fields = allKindsFields()
    const flatten = vi.fn()
    mockLoad.mockResolvedValueOnce(makeDoc(fields, flatten) as never)
    mockLoad.mockResolvedValueOnce(makeDoc(fields, flatten) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('form-section')).toBeTruthy())

    await act(async () => {
      fireEvent.change(screen.getByTestId('field-input-0'), { target: { value: 'abcdefghi' } })
    })
    fireEvent.click(screen.getByTestId('field-input-2'))
    fireEvent.click(screen.getAllByTestId('field-input-3')[1])
    fireEvent.change(screen.getByTestId('field-input-4'), { target: { value: 'US' } })
    const multi = screen.getByTestId('field-input-5') as HTMLSelectElement
    multi.options[0].selected = true
    multi.options[1].selected = true
    fireEvent.change(multi)

    await act(async () => {
      fireEvent.click(screen.getByTestId('export'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())

    const [text, , box, radio, single, multiDd] = fields as [
      PDFTextField,
      PDFTextField,
      PDFCheckBox,
      PDFRadioGroup,
      PDFDropdown,
      PDFDropdown,
    ]
    // maxLength=8 截断
    expect(text.setText).toHaveBeenCalledWith('abcdefgh')
    expect(box.check).toHaveBeenCalled()
    expect(radio.select).toHaveBeenCalledWith('female')
    expect(single.select).toHaveBeenCalledWith('US')
    expect(multiDd.select).toHaveBeenCalledWith(['zh', 'en'])
    // 默认不拼合
    expect(flatten).not.toHaveBeenCalled()
    expect(screen.getByTestId('download')).toBeTruthy()
  })

  it('勾选拼合后导出调用 flatten', async () => {
    const fields = allKindsFields()
    const flatten = vi.fn()
    mockLoad.mockResolvedValueOnce(makeDoc(fields, flatten) as never)
    mockLoad.mockResolvedValueOnce(makeDoc(fields, flatten) as never)
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('form-section')).toBeTruthy())
    fireEvent.click(screen.getByTestId('opt-flatten'))
    await act(async () => {
      fireEvent.click(screen.getByTestId('export'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    expect(flatten).toHaveBeenCalled()
  })

  it('导出失败显示错误', async () => {
    mockLoad.mockResolvedValueOnce(makeDoc(allKindsFields()) as never)
    mockLoad.mockRejectedValueOnce(new Error('save boom'))
    render(<Tool />)
    await upload(makePdfFile())
    await waitFor(() => expect(screen.getByTestId('form-section')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('export'))
    })
    await waitFor(() => expect(screen.getByTestId('error')).toBeTruthy())
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('下载按钮调用 downloadBlob，文件名为 -filled 后缀', async () => {
    const fields = allKindsFields()
    mockLoad.mockResolvedValueOnce(makeDoc(fields) as never)
    mockLoad.mockResolvedValueOnce(makeDoc(fields) as never)
    render(<Tool />)
    await upload(makePdfFile('contract.pdf'))
    await waitFor(() => expect(screen.getByTestId('form-section')).toBeTruthy())
    await act(async () => {
      fireEvent.click(screen.getByTestId('export'))
    })
    await waitFor(() => expect(screen.getByTestId('result')).toBeTruthy())
    fireEvent.click(screen.getByTestId('download'))
    expect(mockDownloadBlob).toHaveBeenCalled()
    const [, name] = mockDownloadBlob.mock.calls[0]
    expect(name).toBe('contract-filled.pdf')
  })

  it('重置清空状态', async () => {
    render(<Tool />)
    await uploadFields()
    fireEvent.click(screen.getByTestId('reset'))
    expect(screen.queryByTestId('form-section')).toBeNull()
    expect(screen.queryByTestId('result')).toBeNull()
  })

  it('拖拽上传', async () => {
    mockLoad.mockResolvedValueOnce(makeDoc([]) as never)
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    fireEvent.dragOver(zone, { dataTransfer: { files: [] } })
    expect(zone.className).toContain('border-blue-500')
    fireEvent.dragLeave(zone)
    const file = makePdfFile()
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: { files: [file] } })
    })
    await waitFor(() => expect(screen.getByTestId('no-fields')).toBeTruthy())
  })

  it('drop 时 dataTransfer 无文件则忽略', async () => {
    render(<Tool />)
    const zone = screen.getByTestId('dropzone')
    await act(async () => {
      fireEvent.drop(zone, { dataTransfer: {} })
    })
    expect(mockLoad).not.toHaveBeenCalled()
  })
})
