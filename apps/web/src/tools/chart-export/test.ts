import { describe, expect, it } from 'vitest'
import {
  EXAMPLE_OPTION,
  parseBgColor,
  parseExportSize,
  parseFormat,
  parseOptionJson,
  transform,
} from './utils'
import type { ChartExportInput } from './schema'

const input = (o: Partial<ChartExportInput>): ChartExportInput => ({ text: '', ...o })

describe('chart-export / parseOptionJson', () => {
  it('正常解析对象', () => {
    const r = parseOptionJson(EXAMPLE_OPTION)
    expect(r.title).toEqual({ text: '示例柱状图', left: 'center' })
    expect(Array.isArray(r.series)).toBe(true)
  })
  it('series 可选：无 series 的对象也合法', () => {
    expect(parseOptionJson('{"title":{"text":"t"}}')).toEqual({ title: { text: 't' } })
  })
  it('空输入抛错', () => {
    expect(() => parseOptionJson('   ')).toThrow(/option JSON 不能为空/)
  })
  it('非法 JSON 抛错', () => {
    expect(() => parseOptionJson('{oops')).toThrow(/JSON 解析失败/)
  })
  it('数组抛错', () => {
    expect(() => parseOptionJson('[1,2]')).toThrow(/须为 JSON 对象/)
  })
  it('null 抛错', () => {
    expect(() => parseOptionJson('null')).toThrow(/须为 JSON 对象/)
  })
  it('原始值抛错', () => {
    expect(() => parseOptionJson('42')).toThrow(/须为 JSON 对象/)
    expect(() => parseOptionJson('"str"')).toThrow(/须为 JSON 对象/)
  })
})

describe('chart-export / parseExportSize', () => {
  it('留空回 fallback', () => {
    expect(parseExportSize('', '宽度', 800)).toBe(800)
  })
  it('正常解析', () => {
    expect(parseExportSize('1024', '宽度', 800)).toBe(1024)
  })
  it('非数字抛错', () => {
    expect(() => parseExportSize('abc', '宽度', 800)).toThrow(/宽度格式非法/)
  })
  it('越界抛错', () => {
    expect(() => parseExportSize('50', '宽度', 800)).toThrow(/宽度须在 100–4000 之间/)
    expect(() => parseExportSize('5000', '宽度', 800)).toThrow(/宽度须在 100–4000 之间/)
  })
})

describe('chart-export / parseBgColor', () => {
  it('留空与 transparent 都返回 transparent', () => {
    expect(parseBgColor('')).toBe('transparent')
    expect(parseBgColor('transparent')).toBe('transparent')
    expect(parseBgColor('TRANSPARENT')).toBe('transparent')
  })
  it('#rgb / #rrggbb 归一为小写', () => {
    expect(parseBgColor('#fff')).toBe('#fff')
    expect(parseBgColor('#FF0000')).toBe('#ff0000')
  })
  it('非法格式抛错', () => {
    expect(() => parseBgColor('red')).toThrow(/背景色格式非法/)
    expect(() => parseBgColor('#ff')).toThrow(/背景色格式非法/)
    expect(() => parseBgColor('#gggggg')).toThrow(/背景色格式非法/)
  })
})

describe('chart-export / parseFormat', () => {
  it('png / svg 通过', () => {
    expect(parseFormat('png')).toBe('png')
    expect(parseFormat('svg')).toBe('svg')
  })
  it('其他值抛错', () => {
    expect(() => parseFormat('jpg')).toThrow(/导出格式非法/)
  })
})

describe('chart-export / transform', () => {
  it('空输入用示例 option', () => {
    expect(transform(input({ text: '' }))).toBe(EXAMPLE_OPTION)
  })
  it('非空输入去空白后返回', () => {
    expect(transform(input({ text: '  {"a":1}  ' }))).toBe('{"a":1}')
  })
})
