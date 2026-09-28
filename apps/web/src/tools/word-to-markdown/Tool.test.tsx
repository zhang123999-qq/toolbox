// @vitest-environment jsdom
/**
 * word-to-markdown 组件测试
 *
 * 用内嵌的最小 docx base64 fixture（不引入 fflate，保持 meta.deps=['mammoth'] 精确）。
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

/** 最小 docx：二级标题「小节」+ 段落「正文内容」 */
const DOCX_SECTION =
  'UEsDBBQAAAAIAAQMPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAAQMPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgABAw8Xa+vXVrLAAAAFgEAABEAAAB3b3JkL2RvY3VtZW50LnhtbG2Puw6CMBiFX4V0lyKDMYTLZhxN1AeoUIGEtqStIKuJmri4+QLOGlcfCOJj2FZlcjn/7cvJ+f1oSwqrwlzkjAZgaDvAwjRmSU7TACwXk8EYRKFfewmLNwRTaSmeCq8OQCZl6UEo4gwTJGxWYqpua8YJkmrkKawZT0rOYiyEsiMFdB1nBAnKKdCWK5Y0upZGZtyUuWwKbNVehYoATDHSQVwAQx/2jBEZto/z67TTe2muaq2Z3vGLdbdrdzm2h317f/6BlX5yqOb3Y/gGUEsBAhQAFAAAAAgABAw8XcxUjBDgAAAAnAEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACAAEDDxdNlfe3KIAAAAYAQAACwAAAAAAAAAAAAAAAAARAQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACAAEDDxdr69dWssAAAAWAQAAEQAAAAAAAAAAAAAAAADcAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAA1gIAAAAA'

/** 空正文 docx（无段落） */
const DOCX_EMPTY =
  'UEsDBBQAAAAIAM0LPF3MVIwQ4AAAAJwBAAATAAAAW0NvbnRlbnRfVHlwZXNdLnhtbH2Qy07DMBBFf8XyFsUOLBBCSbrgsQQW5QNG9iSx8Eset5S/Z9KWLlDbpX0fZ3S71S54scVCLsVe3qpWCowmWRenXn6uX5sHuRq69U9GEmyN1Mu51vyoNZkZA5BKGSMrYyoBKj/LpDOYL5hQ37XtvTYpVoy1qUuHHLpnHGHjq3jZ8fcBW9CTFE8H48LqJeTsnYHKut5G+4/SHAmKk3sPzS7TDRukPktYlMuAY+6ddyjOoviAUt8gsEt/p2K1TWYTOKmu15y5M42jM3jKL225JINEPHDw6qQEcPHvfr2fe/gFUEsDBBQAAAAIAM0LPF02V97cogAAABgBAAALAAAAX3JlbHMvLnJlbHONzzsOwjAMBuCrRN6pCwNCqGkXhNQVlQNEiZtGNA8l4XV7MjBQxMBo+/dnuekedmY3isl4x2Fd1cDISa+M0xzOw3G1g65tTjSLXBJpMiGxsuIShynnsEdMciIrUuUDuTIZfbQilzJqDEJehCbc1PUW46cBS5P1ikPs1RrY8Az0j+3H0Ug6eHm15PKPE1+JIouoKXO4+6hQvdtVYQHbBhcvti9QSwMEFAAAAAgAzQs8XcyM00h9AAAAlwAAABEAAAB3b3JkL2RvY3VtZW50LnhtbE2NQQ4CIRAEv0K4u6AHYwiwN1+gD0DAXZJlhjAo+nvxYOKtO92p0vMrb+wZKyUEw/eT5CyCx5BgMfx6Oe9OfLa6q4D+kSM0Nv5Aqhu+tlaUEOTXmB1NWCKM7Y41uzZqXUTHGkpFH4kGLm/iIOVRZJeAf5E3DG+rxV/4SewHUEsBAhQAFAAAAAgAzQs8XcxUjBDgAAAAnAEAABMAAAAAAAAAAAAAAAAAAAAAAFtDb250ZW50X1R5cGVzXS54bWxQSwECFAAUAAAACADNCzxdNlfe3KIAAAAYAQAACwAAAAAAAAAAAAAAAAARAQAAX3JlbHMvLnJlbHNQSwECFAAUAAAACADNCzxdzIzTSH0AAACXAAAAEQAAAAAAAAAAAAAAAADcAQAAd29yZC9kb2N1bWVudC54bWxQSwUGAAAAAAMAAwC5AAAAiAIAAAAA'

function docxFile(b64: string, name = 'demo.docx'): File {
  return new File([bytesFromBase64(b64)], name, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  })
}

describe('word-to-markdown · Tool', () => {
  it('渲染后 8 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 .docx 文件后输出 Markdown', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_SECTION)] } })
    await waitFor(() => expect(output()).toContain('## 小节'), { timeout: 15000 })
    expect(output()).toContain('正文内容')
  })

  it('空正文文档给出中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [docxFile(DOCX_EMPTY)] } })
    await waitFor(() => expect(output()).toContain('没有可转换的内容'), { timeout: 15000 })
  })

  it('损坏的 docx 给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([1, 2, 3])], 'bad.docx', {
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(output()).toContain('文档解析失败'), { timeout: 15000 })
    expect(byTestId('output').getAttribute('role')).toBe('alert')
  })

  it('文本框点运行给出引导', async () => {
    render(<Tool />)
    fireEvent.click(byTestId('run'))
    await waitFor(() => expect(output()).toContain('选择文件'), { timeout: 10000 })
  })
})
