// @vitest-environment jsdom
/**
 * word-to-html 组件测试
 *
 * 转换走 T2 的文件入口：选中 .docx 即转，结果接管输出区。
 * mammoth 的动态加载在 Tool.tsx 内完成，这里用内嵌的最小 docx
 * base64 fixture（不引入 fflate，保持 meta.deps=['mammoth'] 精确）。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error('缺少 data-testid="' + id + '" 的元素（DEVELOPMENT.md §8.3 要求）')
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

/** base64 → Uint8Array（jsdom 下 atob 可用） */
function bytesFromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i)
  return bytes
}

/** 最小 docx：标题 Hello + 段落 world */
const DOCX_HELLO =
  'UEsDBBQAAAAIAL0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAL0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAvQs8XTbGUf+yAAAADgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2Pyw7CIBBFf6Vhb2ldGNP0sTNdmqgfgGVsmwBDAIv9ewG1Kzd3Xid3ZuruJUW2gLEzqoaUeUEyUAPyWY0NuV1PuyPp2tpXHIenBOWywCtb+YZMzumKUjtMIJnNUYMKswcayVwozUg9Gq4NDmBtsJOC7oviQCWbFYmWd+RrjDrJ2aRwcauAzFcLEw3pgcVDSkLbmm5MEtf2IATGtkvD0I3IZvilwg2C/6GCfvaH5Pdb+wZQSwECFAAUAAAACAC9CzxdzFSMEOAAAACcAQAAEwAAAAAAAAAAAAAAAAAAAAAAW0NvbnRlbnRfVHlwZXNdLnhtbFBLAQIUABQAAAAIAL0LPF02V97cogAAABgBAAALAAAAAAAAAAAAAAAAABEBAABfcmVscy8ucmVsc1BLAQIUABQAAAAIAL0LPF02xlH/sgAAAA4BAAARAAAAAAAAAAAAAAAAANwBAAB3b3JkL2RvY3VtZW50LnhtbFBLBQYAAAAAAwADALkAAAC9AgAAAAA='

/** 带 1x1 PNG 图片的 docx */
const DOCX_IMAGE =
  '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'

/** 空正文 docx（无段落） */
const DOCX_EMPTY =
  'UEsDBBQAAAAIAM0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAM0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAzQs8XcyM00h9AAAAlwAAABEAAAB3b3JkL2RvY3VtZW50LnhtbE2NQQ4CIRAEv0K4u6AHYwiwN1+gD0DAXZJlhjAo+nvxYOKtO92p0vMrb+wZKyUEw/eT5CyCx5BgMfx6Oe9OfLa6q4D+kSM0Nv5Aqhu+tlaUEOTXmB1NWCKM7Y41uzZqXUTHGkpFH4kGLm/iIOVRZJeAf5E3DG+rxV/4SewHUEsBAhQAFAAAAAgAzQs8XcxUjBDgAAAAnAEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACADNCzxdNlfe3KIAAAAYAQAACwAAAAAAAAAAAAAAAAARAQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACADNCzxdzIzTSH0AAACXAAAAEQAAAAAAAAAAAAAAAADcAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAiAIAAAAA'

function docxFile(b64: string, name = 'demo.docx'): File {
  return new File([bytesFromBase64(b64)], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

describe('word-to-html · Tool', () => {
  it('渲染后 8 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 .docx 文件后输出转换后的 HTML', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_HELLO)] } })
    await waitFor(() => expect(output()).toContain('<h1>Hello</h1>'), { timeout: 15000 })
    expect(output()).toContain('<p>world</p>')
    expect(byTestId('file-name').textContent).toContain('demo.docx')
  })

  it('embed 模式把图片转为 data URI', async () => {
    render(<Tool />)
    // 注：TwoColumn 的 select 类型选项没有 data-testid（模板现状），用 label 定位
    fireEvent.change(screen.getByLabelText(/图片处理/), { target: { value: 'embed' } })
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_IMAGE)] } })
    await waitFor(() => expect(output()).toContain('data:image/png;base64,'), { timeout: 15000 })
  })

  it('ignore 模式（默认）去掉图片', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_IMAGE)] } })
    await waitFor(() => expect(output()).toContain('<p>pic</p>'), { timeout: 15000 })
    expect(output()).not.toContain('<img')
  })

  it('空正文文档给出中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_EMPTY)] } })
    await waitFor(() => expect(output()).toContain('没有可转换的内容'), { timeout: 15000 })
  })

  it('损坏文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([1, 2, 3])], 'bad.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(output()).toContain('文档解析失败'), { timeout: 15000 })
  })

  it('选择非 docx 文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File(['x'], 'demo.txt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(output()).toContain('请选择 .docx 文件'), { timeout: 10000 })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('文本框点运行给出引导而不是静默无反应', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('选择文件'), { timeout: 10000 })
  })

  it('点击「清空」回到空输入', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'abc' } })
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
