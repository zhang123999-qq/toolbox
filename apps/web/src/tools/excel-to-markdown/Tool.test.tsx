// @vitest-environment jsdom
/**
 * excel-to-markdown 组件测试
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

function output(): string {
  return byTestId('output').textContent ?? ''
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
  const bytes = XLSX.write(wb, {
    type: 'array',
    bookType: 'xlsx',
  }) as unknown as Uint8Array<ArrayBuffer>
  return new File([bytes], 'demo.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('excel-to-markdown · Tool', () => {
  it('渲染后 9 个必需 data-testid 全部存在', () => {
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
      'option-sheet',
    ]) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('选择 xlsx 文件后输出 Markdown 表格', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [workbookFile()] } })
    await waitFor(() => expect(output()).toContain('| 姓名 | 年龄 |'), { timeout: 15000 })
    expect(output()).toContain('## 人员')
    expect(output()).toContain('| --- | --- |')
  })

  it('指定不存在的工作表给出中文错误', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('option-sheet'), { target: { value: '工资' } })
    fireEvent.change(byTestId('file'), { target: { files: [workbookFile()] } })
    await waitFor(() => expect(output()).toContain('工作表「工资」不存在'), { timeout: 15000 })
  })

  it('损坏文件给出中文错误', async () => {
    render(<Tool />)
    const bad = new File([new Uint8Array([0x50, 0x4b, 0x03, 0x04, 1])], 'bad.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })
    fireEvent.change(byTestId('file'), { target: { files: [bad] } })
    await waitFor(() => expect(output()).toContain('文件解析失败'), { timeout: 15000 })
  })
})
