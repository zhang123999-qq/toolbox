import { describe, expect, it } from 'vitest'
import { CsvToExcelError, escapeXml, renderRow, transform } from './utils'
import type { CsvToExcelInput, CsvToExcelOptions } from './schema'

const baseOptions: CsvToExcelOptions = { format: 'xml', header: true, delimiter: 'comma' }

describe('csv-to-excel / transform', () => {
  it('xml 模式输出 SpreadsheetML 骨架', () => {
    const input: CsvToExcelInput = { text: 'a,b\n1,2' }
    const out = transform(input, baseOptions)
    expect(out).toContain('<?mso-application progid="Excel.Sheet"?>')
    expect(out).toContain('<Worksheet ss:Name="Sheet1">')
    expect(out).toContain('<Row><Cell ss:StyleID="sHeader"><Data ss:Type="String">a</Data></Cell>')
  })

  it('数字单元格标记为 Number', () => {
    const input: CsvToExcelInput = { text: 'a\n29.9' }
    expect(transform(input, baseOptions)).toContain('<Data ss:Type="Number">29.9</Data>')
  })

  it('开启表头时首行加粗样式，关闭后没有', () => {
    const input: CsvToExcelInput = { text: 'a\n1' }
    expect(transform(input, baseOptions)).toContain('ss:StyleID="sHeader"')
    expect(transform(input, { ...baseOptions, header: false })).not.toContain('ss:StyleID')
  })

  it('特殊字符被转义', () => {
    const input: CsvToExcelInput = { text: 'a\n<x> & "y"' }
    expect(transform(input, baseOptions)).toContain('&lt;x&gt; &amp; &quot;y&quot;')
  })

  it('csv 模式重新序列化并统一换行', () => {
    const input: CsvToExcelInput = { text: '"a","b"\r\n1,2\r\n' }
    expect(transform(input, { ...baseOptions, format: 'csv' })).toBe('a,b\n1,2')
  })

  it('tsv 模式用制表符分隔', () => {
    const input: CsvToExcelInput = { text: 'a,b\n1,2' }
    expect(transform(input, { ...baseOptions, format: 'tsv' })).toBe('a\tb\n1\t2')
  })

  it('semicolon 分隔符生效', () => {
    const input: CsvToExcelInput = { text: 'a;b\n1;2' }
    expect(transform(input, { ...baseOptions, format: 'csv', delimiter: 'semicolon' })).toBe(
      'a,b\n1,2',
    )
  })

  it('空单元格只留空 Cell', () => {
    const input: CsvToExcelInput = { text: 'a,b\n1,' }
    expect(transform(input, { ...baseOptions, header: false })).toContain('<Cell/>')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '\n ' }, baseOptions)).toBe('')
  })

  it('引号不配对时抛出 CsvToExcelError（异常）', () => {
    expect(() => transform({ text: 'a,b\n"x,1' }, baseOptions)).toThrow(CsvToExcelError)
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'a'.repeat(5_000_001) }, baseOptions)).toThrow(CsvToExcelError)
  })

  it('工具函数可单独使用', () => {
    expect(escapeXml('<a>&"')).toBe('&lt;a&gt;&amp;&quot;')
    expect(renderRow(['x'], '')).toBe('<Row><Cell><Data ss:Type="String">x</Data></Cell></Row>')
  })
})
