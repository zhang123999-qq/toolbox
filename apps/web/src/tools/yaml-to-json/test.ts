import { describe, expect, it } from 'vitest'
import { YamlToJsonError, transform } from './utils'
import type { YamlToJsonInput, YamlToJsonOptions } from './schema'

const yaml2json: YamlToJsonOptions = { direction: 'yaml2json', indent: '2' }
const json2yaml: YamlToJsonOptions = { direction: 'json2yaml', indent: '2' }

describe('yaml-to-json / transform', () => {
  it('YAML 转 JSON 并保留类型', () => {
    const input: YamlToJsonInput = {
      text: 'name: 工具库\nport: 8080\ndebug: false\nnote: ~\nlist: [1, 2]',
    }
    expect(transform(input, yaml2json)).toBe(
      [
        '{',
        '  "name": "工具库",',
        '  "port": 8080,',
        '  "debug": false,',
        '  "note": null,',
        '  "list": [',
        '    1,',
        '    2',
        '  ]',
        '}',
      ].join('\n'),
    )
  })

  it('嵌套映射与序列互转', () => {
    const input: YamlToJsonInput = {
      text: 'server:\n  host: 127.0.0.1\n  ports:\n    - 80\n    - 443',
    }
    expect(JSON.parse(transform(input, yaml2json))).toEqual({
      server: { host: '127.0.0.1', ports: [80, 443] },
    })
  })

  it('JSON 转 YAML 生成块结构', () => {
    const input: YamlToJsonInput = { text: '{"name":"工具库","tags":["a","b"],"ok":true}' }
    expect(transform(input, json2yaml)).toBe(
      ['name: 工具库', 'tags:', '  - a', '  - b', 'ok: true'].join('\n'),
    )
  })

  it('indent=4 影响 JSON 输出缩进', () => {
    const input: YamlToJsonInput = { text: 'a: 1' }
    expect(transform(input, { direction: 'yaml2json', indent: '4' })).toBe('{\n    "a": 1\n}')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, yaml2json)).toBe('')
    expect(transform({ text: ' \n\t ' }, json2yaml)).toBe('')
  })

  it('YAML 语法错误抛出带行列位置的 YamlToJsonError（异常）', () => {
    expect(() => transform({ text: 'a:\n\tb: 1' }, yaml2json)).toThrow(YamlToJsonError)
    expect(() => transform({ text: 'a:\n\tb: 1' }, yaml2json)).toThrow(/第 2 行/)
  })

  it('JSON 方向收到非法 JSON 时抛错（异常）', () => {
    expect(() => transform({ text: '{oops' }, json2yaml)).toThrow(YamlToJsonError)
  })

  it('超长输入抛错（边界）', () => {
    expect(() => transform({ text: 'a: ' + 'x'.repeat(1_000_001) }, yaml2json)).toThrow(
      YamlToJsonError,
    )
  })
})
