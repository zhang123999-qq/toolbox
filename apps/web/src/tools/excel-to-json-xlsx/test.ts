import { describe, expect, it } from 'vitest'
import { coerceCell, rowsToJson, transform } from './utils'
import type { ExcelToJsonInput, ExcelToJsonOptions } from './schema'

const header: ExcelToJsonOptions = { withHeader: true }
const input = (text: string): ExcelToJsonInput => ({ text })

describe('excel-to-json-xlsx / coerceCell', () => {
  it('空→null，布尔→boolean，整数/浮点→number，其余→string', () => {
    expect(coerceCell('')).toBeNull()
    expect(coerceCell('true')).toBe(true)
    expect(coerceCell('FALSE')).toBe(false)
    expect(coerceCell('123')).toBe(123)
    expect(coerceCell('-7')).toBe(-7)
    expect(coerceCell('870.5')).toBe(870.5)
    expect(coerceCell('007')).toBe('007') // 前导零保留为字符串（类似编号 / 邮编）
    expect(coerceCell('工具库')).toBe('工具库')
  })
})

describe('excel-to-json-xlsx / rowsToJson', () => {
  it('有表头：首行做键并做类型推断', () => {
    const rows = [
      ['id', 'name', 'active', 'score'],
      ['1', '工具库', 'true', '870.5'],
      ['2', '表格', 'false', ''],
    ]
    expect(JSON.parse(rowsToJson(rows, true))).toEqual([
      { id: 1, name: '工具库', active: true, score: 870.5 },
      { id: 2, name: '表格', active: false, score: null },
    ])
  })

  it('无表头：返回二维数组', () => {
    expect(
      JSON.parse(
        rowsToJson(
          [
            ['a', '1'],
            ['b', '2'],
          ],
          false,
        ),
      ),
    ).toEqual([
      ['a', 1],
      ['b', 2],
    ])
  })

  it('空表头单元格用 _N，重名键加序号去重', () => {
    const json = JSON.parse(
      rowsToJson(
        [
          ['x', '', 'x'],
          ['1', '2', '3'],
        ],
        true,
      ),
    )
    expect(json[0]).toEqual({ x: 1, _2: 2, x_2: 3 })
  })

  it('空表返回 []（边界）', () => {
    expect(rowsToJson([], true)).toBe('[]')
  })
})

describe('excel-to-json-xlsx / transform', () => {
  it('CSV 文本转 JSON 对象数组', () => {
    const json = JSON.parse(transform(input('id,name\n1,工具库'), header))
    expect(json).toEqual([{ id: 1, name: '工具库' }])
  })

  it('TSV（制表符）自动识别', () => {
    const json = JSON.parse(transform(input('a\tb\n1\t2'), header))
    expect(json).toEqual([{ a: 1, b: 2 }])
  })

  it('空输入返回空串；超长抛错（边界 / 异常）', () => {
    expect(transform(input('   '), header)).toBe('')
    expect(() => transform(input('x'.repeat(5_000_001)), header)).toThrow()
  })
})
