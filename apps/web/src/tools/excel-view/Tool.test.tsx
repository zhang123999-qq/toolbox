// @vitest-environment jsdom
/**
 * excel-view 组件测试
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

function workbookFile(): File {
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      ['姓名', '年龄'],
      ['张三', 30],
    ]),
    '人员',
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([]), '空表')
  const bytes = XLSX.write(wb, {
    type: 'array',
    bookType: 'xlsx',
  }) as unknown as Uint8Array<ArrayBuffer>
  return new File([bytes], 'demo.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('excel-view · Tool', () => {
  it('渲染后必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download', 'file']) {
      expect(byTestId(id)).toBeTruthy()
    }
    // 上传前不显示文件名（无 options，故 file-name 是第 9 个动态 testid）
    expect(screen.queryByTestId('file-name')).toBeNull()
  })

  it('选择文件后渲染表格与工作表页签', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [workbookFile()] } })
    await waitFor(() => expect(byTestId('sheet-table')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('file-name').textContent).toBe('demo.xlsx')
    expect(byTestId('sheet-tab-0').textContent).toBe('人员')
    expect(byTestId('sheet-tab-1').textContent).toBe('空表')
    expect(byTestId('sheet-table').textContent).toContain('张三')
    expect(byTestId('sheet-info').textContent).toContain('共 2 行')
  })

  it('切换工作表页签显示空表', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [workbookFile()] } })
    await waitFor(() => expect(byTestId('sheet-tab-1')).toBeTruthy(), { timeout: 15000 })
    fireEvent.click(byTestId('sheet-tab-1'))
    expect(byTestId('empty-sheet').textContent).toContain('空表')
  })

  it('损坏文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('excel-error')).toBeTruthy(), { timeout: 15000 })
    expect(byTestId('excel-error').textContent).toContain('文件解析失败')
  })

  it('非 Excel 文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File(['hello'], 'a.txt', { type: 'text/plain' })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(byTestId('excel-error')).toBeTruthy(), { timeout: 10000 })
    expect(byTestId('excel-error').textContent).toContain('请选择 Excel 文件')
  })
})
