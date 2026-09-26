import { describe, expect, it } from 'vitest'
import { JsonTreeError, MAX_INPUT, transform } from './utils'
import type { JsonTreeInput, JsonTreeOptions } from './schema'

const baseOptions: JsonTreeOptions = { mode: 'tree', sortKeys: false }

function text(value: string): JsonTreeInput {
  return { text: value }
}

const SAMPLE = '{"name":"工具库","tools":870,"tags":["json","static"]}'

describe('json-tree / transform', () => {
  it('树形模式输出缩进层级与类型标注', () => {
    expect(transform(text(SAMPLE), baseOptions)).toBe(
      [
        '$ <object> 3 项',
        '  name <string> "工具库"',
        '  tools <number> 870',
        '  tags <array> 2 项',
        '    [0] <string> "json"',
        '    [1] <string> "static"',
      ].join('\n'),
    )
  })

  it('sortKeys 开启时对象键按字典序排列', () => {
    expect(transform(text('{"b":1,"a":2}'), { mode: 'tree', sortKeys: true })).toBe(
      ['$ <object> 2 项', '  a <number> 2', '  b <number> 1'].join('\n'),
    )
  })

  it('path 模式把每个叶子平铺成 $.xx[i] 形式', () => {
    expect(transform(text(SAMPLE), { mode: 'path', sortKeys: false })).toBe(
      ['$.name = "工具库"', '$.tools = 870', '$.tags[0] = "json"', '$.tags[1] = "static"'].join(
        '\n',
      ),
    )
  })

  it('空容器与标量也能正常展开（边界）', () => {
    expect(transform(text('{}'), baseOptions)).toBe('$ <object> 0 项')
    expect(transform(text('[]'), baseOptions)).toBe('$ <array> 0 项')
    expect(transform(text('null'), baseOptions)).toBe('$ <null> null')
    expect(transform(text(''), baseOptions)).toBe('')
    expect(transform(text(' \n '), baseOptions)).toBe('')
  })

  it('超长字符串被截断并保留原始长度说明（边界）', () => {
    const long = JSON.stringify({ text: 'x'.repeat(200) })
    const line = transform(text(long), baseOptions).split('\n')[1]
    expect(line).toContain('…（共 202 字符）')
    expect(line.length).toBeLessThan(140)
  })

  it('非法 JSON 抛出 JsonTreeError（异常）', () => {
    expect(() => transform(text('{"a":'), baseOptions)).toThrow(JsonTreeError)
  })

  it('超长输入抛出 JsonTreeError（边界）', () => {
    expect(() => transform(text('x'.repeat(MAX_INPUT + 1)), baseOptions)).toThrow(JsonTreeError)
  })
})
