// @vitest-environment jsdom
/**
 * doc-convert 组件测试
 *
 * mammoth 走真实动态加载（jsdom 下可用）；xlsx 为静态依赖。
 * docx / 空 docx 用内嵌 base64 fixture，xlsx 用 xlsx 库现场构造。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import * as XLSX from 'xlsx'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function bytesFromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** 含 Hello/world 的最小 docx（与 word-to-html 同构） */
const DOCX_HELLO =
  'UEsDBBQAAAAIAL0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAL0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAvQs8XTbGUf+yAAAADgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2Pyw7CIBBFf6Vhb2ldGNP0sTNdmqgfgGVsmwBDAIv9ewG1Kzd3Xid3ZuruJUW2gLEzqoaUeUEyUAPyWY0NuV1PuyPp2tpXHIenBOWywCtb+YZMzumKUjtMIJnNUYMKswcayVwozUg9Gq4NDmBtsJOC7oviQCWbFYmWd+RrjDrJ2aRwcauAzFcLEw3pgcVDSkLbmm5MEtf2IATGtkvD0I3IZvilwg2C/6GCfvaH5Pdb+wZQSwECFAAUAAAACAC9CzxdzFSMEOAAAACcAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAIAL0LPF02V97cogAAABgBAAALAAAAAAAAAAAAAAAAABEBAABfcmVscy8ucmVsc1BLAQIUABQAAAAIAL0LPF02xlH/sgAAAA4BAAARAAAAAAAAAAAAAAAAANwBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAAC9AgAAAAA='
/** 无文本内容的 docx */
const DOCX_EMPTY =
  'UEsDBBQAAAAIAM0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAM0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAzQs8XcyM00h9AAAAlwAAABEAAAB3b3JkL2RvY3VtZW50LnhtbE2NQQ4CIRAEv0K4u6AHYwiwN1+gD0DAXZJlhjAo+nvxYOKtO92p0vMrb+wZKyUEw/eT5CyCx5BgMfx6Oe9OfLa6q4D+kSM0Nv5Aqhu+tlaUEOTXmB1NWCKM7Y41uzZqXUTHGkpFH4kGLm/iIOVRZJeAf5E3DG+rxV/4SewHUEsBAhQAFAAAAAgAzQs8XcxUjBDgAAAAnAEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACADNCzxdNlfe3KIAAAAYAQAACwAAAAAAAAAAAAAAAAARAQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACADNCzxdzIzTSH0AAACXAAAAEQAAAAAAAAAAAAAAAADcAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAiAIAAAAA'

function docxFile(b64: string, name: string): File {
  return new File([bytesFromBase64(b64)], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

function xlsxFile(): File {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['姓名', '年龄'],
      ['张三', 30],
    ]),
    '人员',
  )
  const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new File([bytes], 'data.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

function selectTarget(value: string): void {
  fireEvent.change(byTestId('target'), { target: { value } })
}

describe('doc-convert · Tool', () => {
  it('渲染后必需 data-testid 全部存在，目标选择器初始禁用', () => {
    render(<Tool />)
    for (const id of [
      'input',
      'run',
      'example',
      'clear',
      'output',
      'copy',
      'download',
      'file',
      'target',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
    expect((byTestId('target') as HTMLSelectElement).disabled).toBe(true)
  })

  it('docx 默认转 txt', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_HELLO, 'hello.docx')] } })
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('preview').textContent).toContain('Hello')
    expect((byTestId('target') as HTMLSelectElement).value).toBe('txt')
    expect(byTestId('download-file').getAttribute('download')).toBe('hello.txt')
  }, 20000)

  it('docx 切换目标为 md / html', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_HELLO, 'hello.docx')] } })
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 15000 })
    selectTarget('md')
    await waitFor(() => expect(byTestId('preview').textContent).toContain('# Hello'), {
      timeout: 15000,
    })
    expect(byTestId('download-file').getAttribute('download')).toBe('hello.md')
    selectTarget('html')
    await waitFor(() => expect(byTestId('preview').textContent).toContain('Hello'), {
      timeout: 15000,
    })
  }, 30000)

  it('无文本的 docx 给出中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_EMPTY, 'empty.docx')] } })
    await waitFor(() => expect(byTestId('convert-error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('convert-error').textContent).toContain('没有可转换的文本内容')
  }, 20000)

  it('xlsx 默认转 json，可切换 csv', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [xlsxFile()] } })
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('preview').textContent).toContain('张三')
    expect((byTestId('target') as HTMLSelectElement).value).toBe('json')
    selectTarget('csv')
    await waitFor(() => expect(byTestId('preview').textContent).toContain('姓名'), {
      timeout: 10000,
    })
    expect(byTestId('download-file').getAttribute('download')).toBe('data.csv')
  }, 20000)

  it('csv 转 xlsx：二进制结果与下载名', async () => {
    render(<Tool />)
    const csv = new File(['a,b\n1,2\n'], 't.csv', { type: 'text/csv' })
    fireEvent.change(byTestId('file'), { target: { files: [csv] } })
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 15000 })
    selectTarget('xlsx')
    await waitFor(() => expect(byTestId('preview-binary')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('preview-binary').textContent).toContain('字节')
    expect(byTestId('download-file').getAttribute('download')).toBe('t.xlsx')
  }, 20000)

  it('json 转 csv', async () => {
    render(<Tool />)
    const json = new File(['[{"a": 1}]'], 't.json', { type: 'application/json' })
    fireEvent.change(byTestId('file'), { target: { files: [json] } })
    await waitFor(() => expect(byTestId('preview')).toBeTruthy(), { timeout: 15000 })
    selectTarget('csv')
    await waitFor(() => expect(byTestId('preview').textContent).toContain('a'), { timeout: 10000 })
  }, 20000)

  it('非法 JSON 给出中文错误', async () => {
    render(<Tool />)
    const json = new File(['oops'], 't.json', { type: 'application/json' })
    fireEvent.change(byTestId('file'), { target: { files: [json] } })
    await waitFor(() => expect(byTestId('convert-error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('convert-error').textContent).toContain('JSON 解析失败')
  }, 20000)

  it('不支持的文件类型给出中文错误', async () => {
    render(<Tool />)
    const bad = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('convert-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('convert-error').textContent).toContain('不支持的文件类型')
  })

  it('损坏的 xlsx 给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 120, 120])], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('convert-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('convert-error').textContent).toContain('表格解析失败')
  })
})
