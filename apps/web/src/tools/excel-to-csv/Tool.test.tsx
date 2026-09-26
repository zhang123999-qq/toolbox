// @vitest-environment jsdom
/**
 * excel-to-csv 组件测试（DEVELOPMENT.md §8.2 的 8 文件基线之一）
 *
 * 文件入口两条路径都跑真实实现：文本表格走 papaparse，.xlsx 走最小 zip 解析。
 */
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import Tool from './Tool'

afterEach(cleanup)

/** 取带 data-testid 的元素，命中不到时给出可读报错 */
function byTestId(id: string): HTMLElement {
  const el = screen.queryByTestId(id)
  if (!el) throw new Error(`缺少 data-testid="${id}" 的元素（DEVELOPMENT.md §8.3 要求）`)
  return el
}

function output(): string {
  return byTestId('output').textContent ?? ''
}

/** 造一个文本文件；jsdom 支持 File 与 arrayBuffer() */
function makeFile(name: string, content: string): File {
  return new File([new TextEncoder().encode(content)], name, { type: 'text/plain' })
}

/**
 * 拼一个「未压缩」的最小 xlsx：测试里不需要真的 deflate，
 * 只要 zip 目录结构正确就能覆盖 readZip → sheetToRows 这条链路。
 */
function makeXlsx(): File {
  const encoder = new TextEncoder()
  const entries: readonly [string, string][] = [
    ['xl/sharedStrings.xml', '<sst><si><t>name</t></si><si><t>工具库</t></si></sst>'],
    [
      'xl/worksheets/sheet1.xml',
      '<worksheet><sheetData>' +
        '<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>' +
        '<row r="2"><c r="A2"><v>870</v></c></row>' +
        '</sheetData></worksheet>',
    ],
  ]
  const parts: Uint8Array[] = []
  const central: Uint8Array[] = []
  let offset = 0
  for (const [name, xml] of entries) {
    const raw = encoder.encode(xml)
    const nameBytes = encoder.encode(name)
    const local = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(local.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint32(18, raw.length, true)
    localView.setUint32(22, raw.length, true)
    localView.setUint16(26, nameBytes.length, true)
    local.set(nameBytes, 30)
    const dir = new Uint8Array(46 + nameBytes.length)
    const dirView = new DataView(dir.buffer)
    dirView.setUint32(0, 0x02014b50, true)
    dirView.setUint32(20, raw.length, true)
    dirView.setUint32(24, raw.length, true)
    dirView.setUint16(28, nameBytes.length, true)
    dirView.setUint32(42, offset, true)
    dir.set(nameBytes, 46)
    parts.push(local, raw)
    central.push(dir)
    offset += local.length + raw.length
  }
  const cdSize = central.reduce((sum, part) => sum + part.length, 0)
  const eocd = new Uint8Array(22)
  const eocdView = new DataView(eocd.buffer)
  eocdView.setUint32(0, 0x06054b50, true)
  eocdView.setUint16(8, entries.length, true)
  eocdView.setUint16(10, entries.length, true)
  eocdView.setUint32(12, cdSize, true)
  eocdView.setUint32(16, offset, true)
  const all = [...parts, ...central, eocd]
  const bytes = new Uint8Array(all.reduce((sum, part) => sum + part.length, 0))
  let cursor = 0
  for (const part of all) {
    bytes.set(part, cursor)
    cursor += part.length
  }
  return new File([bytes], 'demo.xlsx', {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

describe('excel-to-csv · Tool', () => {
  it('渲染后 7 个必需 data-testid 全部存在', () => {
    render(<Tool />)
    for (const id of ['input', 'run', 'example', 'clear', 'output', 'copy', 'download']) {
      expect(byTestId(id)).toBeTruthy()
    }
  })

  it('提供文件入口', () => {
    render(<Tool />)
    expect(byTestId('file')).toBeTruthy()
  })

  it('文本区输入 TSV 后输出 CSV', () => {
    render(<Tool />)
    fireEvent.change(byTestId('input'), { target: { value: 'a\tb\n1\t2' } })
    expect(output()).toBe('a,b\n1,2')
  })

  it('点击「示例」填入 TSV 并产出 CSV', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    expect(output()).toBe('name,tools,local\n工具库,870,true')
  })

  it('选择 .csv 文件后直接出结果并回显文件名', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [makeFile('demo.csv', 'a,b\n1,2')] },
    })
    await waitFor(() => expect(output()).toBe('a,b\n1,2'))
    expect(byTestId('file-name').textContent).toContain('demo.csv')
  })

  it('选择 .xlsx 文件后解析第一张工作表', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), { target: { files: [makeXlsx()] } })
    await waitFor(() => expect(output()).toBe('name,工具库\n870,'))
  })

  it('选到非 zip 的 .xlsx 时给出中文错误提示', async () => {
    render(<Tool />)
    fireEvent.change(byTestId('file'), {
      target: { files: [makeFile('broken.xlsx', 'a,b\n1,2')] },
    })
    await waitFor(() => expect(byTestId('output').getAttribute('role')).toBe('alert'))
    expect(output()).toContain('不是 .xlsx')
  })

  it('点击「清空」回到空输入', () => {
    render(<Tool />)
    fireEvent.click(byTestId('example'))
    fireEvent.click(byTestId('clear'))
    expect((byTestId('input') as HTMLTextAreaElement).value).toBe('')
  })
})
