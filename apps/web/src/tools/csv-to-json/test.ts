import { describe, expect, it } from 'vitest'
import { CsvToJsonError, buildHeader, inferValue, transform } from './utils'
import type { CsvToJsonInput, CsvToJsonOptions } from './schema'

const baseOptions: CsvToJsonOptions = { header: true, delimiter: 'comma', indent: '0' }

describe('csv-to-json / transform', () => {
  it('首行为表头时输出对象数组', () => {
    const input: CsvToJsonInput = { text: 'name,tools\n工具库,870' }
    expect(transform(input, baseOptions)).toBe('[{"name":"工具库","tools":870}]')
  })

  it('推断数字、布尔与空值', () => {
    const input: CsvToJsonInput = { text: 'a,b,c,d\n1,true,,null' }
    expect(transform(input, baseOptions)).toBe('[{"a":1,"b":true,"c":null,"d":null}]')
  })

  it('关闭表头时输出二维数组', () => {
    const input: CsvToJsonInput = { text: 'a,1\nb,2' }
    expect(transform(input, { ...baseOptions, header: false })).toBe('[["a",1],["b",2]]')
  })

  it('带引号的单元格不会被逗号切坏', () => {
    const input: CsvToJsonInput = { text: 'a,b\n"x,y",2' }
    expect(transform(input, baseOptions)).toBe('[{"a":"x,y","b":2}]')
  })

  it('缺列补 null、多出的列忽略', () => {
    const input: CsvToJsonInput = { text: 'a,b,c\n1' }
    expect(transform(input, baseOptions)).toBe('[{"a":1,"b":null,"c":null}]')
  })

  it('重名表头自动去重', () => {
    const input: CsvToJsonInput = { text: 'a,a,\nb,c,d' }
    expect(transform(input, baseOptions)).toBe('[{"a":"b","a_2":"c","column_3":"d"}]')
  })

  it('tab 分隔符生效', () => {
    const input: CsvToJsonInput = { text: 'a\tb\n1\t2' }
    expect(transform(input, { ...baseOptions, delimiter: 'tab' })).toBe('[{"a":1,"b":2}]')
  })

  it('缩进档位生效', () => {
    const input: CsvToJsonInput = { text: 'a\n1' }
    expect(transform(input, { ...baseOptions, indent: '2' })).toBe('[\n  {\n    "a": 1\n  }\n]')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '\n \t' }, baseOptions)).toBe('')
  })

  it('只有表头时输出空数组', () => {
    expect(transform({ text: 'a,b' }, baseOptions)).toBe('[]')
  })

  it('引号不配对时抛出 CsvToJsonError（异常）', () => {
    expect(() => transform({ text: 'a,b\n"x,1' }, baseOptions)).toThrow(CsvToJsonError)
  })

  it('超长输入抛错', () => {
    expect(() => transform({ text: 'a'.repeat(5_000_001) }, baseOptions)).toThrow(CsvToJsonError)
  })

  it('工具函数可单独使用', () => {
    expect(inferValue('007')).toBe('007')
    expect(inferValue('1.50')).toBe(1.5)
    expect(inferValue('99999999999999999999')).toBe('99999999999999999999')
    expect(buildHeader(['a', 'a', ''])).toEqual(['a', 'a_2', 'column_3'])
  })
})
