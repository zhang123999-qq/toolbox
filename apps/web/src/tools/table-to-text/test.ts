import { describe, expect, it } from 'vitest'
import { transform } from './utils'

describe('table-to-text / transform', () => {
  it('TSV 自动识别并输出 Markdown 表格', () => {
    const out = transform(
      { text: 'name\tage\n张三\t28' },
      { delimiter: 'auto', format: 'markdown', header: true },
    )
    expect(out).toContain('| name | age |')
    expect(out).toContain('| --- | --- |')
    expect(out).toContain('| 张三 | 28 |')
  })

  it('输出 CSV 时含逗号的单元格加引号', () => {
    const out = transform(
      { text: 'a,b\n"x,y",z' },
      { delimiter: 'comma', format: 'csv', header: false },
    )
    expect(out).toBe('a,b\n"x,y",z')
  })

  it('输出 JSON 时首行做键', () => {
    const out = transform(
      { text: 'name,age\n张三,28\n李四,31' },
      { delimiter: 'comma', format: 'json', header: true },
    )
    const data = JSON.parse(out) as Array<Record<string, string>>
    expect(data).toHaveLength(2)
    expect(data[0].name).toBe('张三')
    expect(data[1].age).toBe('31')
  })

  it('不选表头时 JSON 输出二维数组', () => {
    const out = transform(
      { text: 'a,b\n1,2' },
      { delimiter: 'comma', format: 'json', header: false },
    )
    expect(JSON.parse(out)).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('未指定表头时 Markdown 用「列 1…」占位', () => {
    const out = transform(
      { text: 'a,b\n1,2' },
      { delimiter: 'comma', format: 'markdown', header: false },
    )
    expect(out.split('\n')[0]).toBe('| 列 1 | 列 2 |')
  })

  it('CSV 输出统一用 LF 换行', () => {
    const out = transform(
      { text: 'a,b\n1,2' },
      { delimiter: 'comma', format: 'csv', header: false },
    )
    expect(out).not.toContain('\r')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, { delimiter: 'auto', format: 'markdown', header: true })).toBe(
      '',
    )
  })
})
