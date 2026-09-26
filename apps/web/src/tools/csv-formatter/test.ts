import { describe, expect, it } from 'vitest'
import { CsvFormatterError, alignRows, displayWidth, findMismatches, transform } from './utils'
import type { CsvFormatterInput, CsvFormatterOptions } from './schema'

const baseOptions: CsvFormatterOptions = { mode: 'align', delimiter: 'comma', strict: false }

describe('csv-formatter / transform', () => {
  it('align 模式按列宽补齐空格', () => {
    const input: CsvFormatterInput = { text: 'name,tools\na,1\nbb,22' }
    expect(transform(input, baseOptions)).toBe('name,tools\na   ,1    \nbb  ,22   ')
  })

  it('引号内的分隔符不会被切坏', () => {
    const input: CsvFormatterInput = { text: 'a,b\n"x,y",2' }
    expect(transform(input, baseOptions)).toBe('a  ,b\nx,y,2')
  })

  it('minify 模式去掉多余引号、统一换行为 LF', () => {
    // 只去掉「不必要」的引号：单元格里的前导空格是有意义的，不会被改动
    const input: CsvFormatterInput = { text: '"a","b"\r\n\n1,2\r\n' }
    expect(transform(input, { ...baseOptions, mode: 'minify' })).toBe('a,b\n1,2')
  })

  it('tab 分隔符生效', () => {
    const input: CsvFormatterInput = { text: 'a\tb\n1\t2' }
    expect(transform(input, { ...baseOptions, mode: 'minify', delimiter: 'tab' })).toBe(
      'a\tb\n1\t2',
    )
  })

  it('validate 模式报告列数不一致的行', () => {
    const input: CsvFormatterInput = { text: 'a,b,c\n1,2\n3,4,5' }
    expect(transform(input, { ...baseOptions, mode: 'validate' })).toContain('第 2 行：2 列')
  })

  it('validate 模式在一致时给出总览', () => {
    const input: CsvFormatterInput = { text: 'a,b\n1,2' }
    expect(transform(input, { ...baseOptions, mode: 'validate' })).toBe(
      '共 2 行，首行 2 列，列数全部一致 ✓',
    )
  })

  it('strict 打开时列数不一致直接抛错（异常）', () => {
    const input: CsvFormatterInput = { text: 'a,b,c\n1,2' }
    expect(() => transform(input, { ...baseOptions, strict: true })).toThrow(CsvFormatterError)
  })

  it('引号不配对时抛出中文错误', () => {
    const input: CsvFormatterInput = { text: 'a,b\n"x,1' }
    expect(() => transform(input, baseOptions)).toThrow(CsvFormatterError)
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: ' \n\t ' }, baseOptions)).toBe('')
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'a'.repeat(5_000_001) }, baseOptions)).toThrow(CsvFormatterError)
  })

  it('工具函数可单独使用', () => {
    expect(displayWidth('工具库')).toBe(6)
    expect(displayWidth('ab')).toBe(2)
    expect(findMismatches([['a'], ['a', 'b']])).toEqual([{ line: 2, count: 2, raw: 'a,b' }])
    expect(alignRows([['a'], ['bb']], ',')).toBe('a \nbb')
  })
})
