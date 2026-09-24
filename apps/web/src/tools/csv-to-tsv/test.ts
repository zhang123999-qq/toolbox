import { describe, expect, it } from 'vitest'
import { convert, transform } from './utils'
import type { CsvToTsvOptions } from './schema'

const toTsv: CsvToTsvOptions = { mode: 'csv2tsv' }
const toCsv: CsvToTsvOptions = { mode: 'tsv2csv' }

describe('csv-to-tsv / convert', () => {
  it('CSV 转 TSV', () => {
    expect(convert('a,b\n1,2', 'csv2tsv')).toBe('a\tb\n1\t2')
  })

  it('TSV 转 CSV', () => {
    expect(convert('a\tb\n1\t2', 'tsv2csv')).toBe('a,b\n1,2')
  })

  it('含分隔符的字段由 papaparse 负责加引号', () => {
    expect(convert('"a,b",c', 'csv2tsv')).toBe('a,b\tc')
  })

  it('含引号的字段往返一致', () => {
    expect(convert(convert('a,"b""c"', 'csv2tsv'), 'tsv2csv')).toBe('a,"b""c"')
  })
})

describe('csv-to-tsv / transform', () => {
  it('默认 CSV 转 TSV', () => {
    expect(transform({ text: 'a,b' }, toTsv)).toBe('a\tb')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: ' ' }, toCsv)).toBe('')
  })
})
