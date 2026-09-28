/**
 * translation-convert（#726）utils 单测：i18n 格式互转。
 */
import { describe, expect, it } from 'vitest'
import {
  convertI18n,
  flattenJson,
  parseI18n,
  serializeI18n,
  unflattenJson,
  type I18nFormat,
} from './utils'

describe('flattenJson', () => {
  it('拍平嵌套对象', () => {
    expect(flattenJson({ a: { b: 'x', c: 1 }, d: true })).toEqual([
      { key: 'a.b', value: 'x' },
      { key: 'a.c', value: '1' },
      { key: 'd', value: 'true' },
    ])
  })
  it('空对象得空条目', () => {
    expect(flattenJson({})).toEqual([])
  })
  it('顶层非对象抛中文错', () => {
    expect(() => flattenJson([1])).toThrow('顶层必须是对象')
    expect(() => flattenJson('s')).toThrow('顶层必须是对象')
    expect(() => flattenJson(null)).toThrow('顶层必须是对象')
  })
  it('数组值抛中文错', () => {
    expect(() => flattenJson({ a: [1] })).toThrow('暂不支持数组')
  })
  it('空值抛中文错', () => {
    expect(() => flattenJson({ a: null })).toThrow('值为空')
    expect(() => flattenJson({ a: undefined })).toThrow('值为空')
  })
})

describe('unflattenJson', () => {
  it('还原嵌套', () => {
    expect(
      unflattenJson([
        { key: 'a.b', value: 'x' },
        { key: 'a.c', value: 'y' },
      ]),
    ).toEqual({ a: { b: 'x', c: 'y' } })
  })
  it('空键抛错', () => {
    expect(() => unflattenJson([{ key: '  ', value: 'x' }])).toThrow('空键')
  })
  it('空路径段抛错', () => {
    expect(() => unflattenJson([{ key: 'a..b', value: 'x' }])).toThrow('空路径段')
  })
  it('路径冲突抛错', () => {
    expect(() =>
      unflattenJson([
        { key: 'a', value: 'x' },
        { key: 'a.b', value: 'y' },
      ]),
    ).toThrow('路径冲突')
  })
  it('重复键抛错', () => {
    expect(() =>
      unflattenJson([
        { key: 'a', value: 'x' },
        { key: 'a', value: 'y' },
      ]),
    ).toThrow('重复')
  })
})

describe('parseI18n · JSON', () => {
  it('解析嵌套 JSON', () => {
    expect(parseI18n('{"a":{"b":"你好"}}', 'json')).toEqual([{ key: 'a.b', value: '你好' }])
  })
  it('非法 JSON 抛中文错', () => {
    expect(() => parseI18n('{oops', 'json')).toThrow('JSON 解析失败')
  })
  it('空输入抛错', () => {
    expect(() => parseI18n('   ', 'json')).toThrow('请输入待转换的内容')
  })
  it('未知格式抛错', () => {
    expect(() => parseI18n('{}', 'xml' as I18nFormat)).toThrow('不支持的格式')
  })
})

describe('parseI18n · PO', () => {
  it('基本 msgid/msgstr', () => {
    const po = 'msgid "hello"\nmsgstr "你好"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'hello', value: '你好' }])
  })
  it('多行续接拼接', () => {
    const po = 'msgid "hel"\n"lo"\nmsgstr "你"\n"好"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'hello', value: '你好' }])
  })
  it('复数取 msgstr[0]', () => {
    const po = 'msgid "apple"\nmsgid_plural "apples"\nmsgstr[0] "苹果"\nmsgstr[1] "苹果们"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'apple', value: '苹果' }])
  })
  it('复数续行被容忍', () => {
    const po = 'msgid "a"\nmsgid_plural "ap"\n"ples"\nmsgstr[0] "甲"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'a', value: '甲' }])
  })
  it('头信息与注释被跳过', () => {
    const po = '# translator comment\nmsgid ""\nmsgstr "Project-Id-Version: x"\n\n#: ref\nmsgid "k"\nmsgstr "v"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'k', value: 'v' }])
  })
  it('转义还原', () => {
    const po = 'msgid "a"\nmsgstr "x\\ny\\"q\\t"\n'
    expect(parseI18n(po, 'po')).toEqual([{ key: 'a', value: 'x\ny"q\t' }])
    expect(parseI18n('msgid "a"\nmsgstr "p\\\\q"\n', 'po')).toEqual([{ key: 'a', value: 'p\\q' }])
  })
  it('孤立续行抛错', () => {
    expect(() => parseI18n('"oops"\n', 'po')).toThrow('孤立的字符串续行')
  })
  it('未加引号抛错', () => {
    expect(() => parseI18n('msgid oops\n', 'po')).toThrow('双引号包裹')
  })
  it('非法 msgstr 索引抛错', () => {
    expect(() => parseI18n('msgid "a"\nmsgstr[x] "b"\n', 'po')).toThrow('索引非法')
    expect(() => parseI18n('msgid "a"\nmsgstr[0 "b"\n', 'po')).toThrow('索引非法')
  })
  it('无 msgstr 时值为空串', () => {
    expect(parseI18n('msgid "a"\n', 'po')).toEqual([{ key: 'a', value: '' }])
  })
  it('无法识别的行抛错', () => {
    expect(() => parseI18n('nonsense line here\n', 'po')).toThrow('无法识别')
  })
})

describe('parseI18n · YAML', () => {
  it('嵌套解析', () => {
    const yml = 'a:\n  b: 你好\n  c: "x: y"\n# comment\nd: 1\n'
    expect(parseI18n(yml, 'yaml')).toEqual([
      { key: 'a.b', value: '你好' },
      { key: 'a.c', value: 'x: y' },
      { key: 'd', value: '1' },
    ])
  })
  it('单引号转义', () => {
    expect(parseI18n("a: 'it''s'\n", 'yaml')).toEqual([{ key: 'a', value: "it's" }])
  })
  it('制表符抛错', () => {
    expect(() => parseI18n('a:\n\tb: 1\n', 'yaml')).toThrow('制表符')
  })
  it('列表项抛错', () => {
    expect(() => parseI18n('a:\n  - 1\n', 'yaml')).toThrow('暂不支持列表')
    expect(() => parseI18n('-\n', 'yaml')).toThrow('暂不支持列表')
  })
  it('非法行抛错', () => {
    expect(() => parseI18n('just text\n', 'yaml')).toThrow('应为「key: value」')
  })
  it('空键抛错', () => {
    expect(() => parseI18n(': v\n', 'yaml')).toThrow('键为空')
  })
  it('重复键抛错', () => {
    expect(() => parseI18n('a: 1\na: 2\n', 'yaml')).toThrow('重复')
  })
})

describe('parseI18n · CSV', () => {
  it('带表头解析', () => {
    expect(parseI18n('key,value\na,你好\n', 'csv')).toEqual([{ key: 'a', value: '你好' }])
  })
  it('无表头解析', () => {
    expect(parseI18n('a,你好\n', 'csv')).toEqual([{ key: 'a', value: '你好' }])
  })
  it('引号含逗号与转义', () => {
    expect(parseI18n('key,value\n"a,b","x""y"\n', 'csv')).toEqual([{ key: 'a,b', value: 'x"y' }])
  })
  it('缺少 value 列抛错', () => {
    expect(() => parseI18n('key,value\na\n', 'csv')).toThrow('缺少 value 列')
    expect(() => parseI18n('key\na\n', 'csv')).toThrow('缺少 value 列')
  })
  it('空键抛错', () => {
    expect(() => parseI18n('key,value\n ,x\n', 'csv')).toThrow('键为空')
  })
  it('空内容抛错', () => {
    expect(() => parseI18n('\n\n', 'csv')).toThrow('请输入待转换的内容')
  })
  it('中间空行被跳过', () => {
    expect(parseI18n('key,value\na,甲\n\nb,乙\n', 'csv')).toEqual([
      { key: 'a', value: '甲' },
      { key: 'b', value: '乙' },
    ])
  })
  it('无数据行抛错', () => {
    expect(() => parseI18n('key,value\n', 'csv')).toThrow('没有数据行')
  })
  it('引号位置非法抛错', () => {
    expect(() => parseI18n('ab"cd,ef\n', 'csv')).toThrow('引号位置非法')
  })
  it('引号未闭合抛错', () => {
    expect(() => parseI18n('"abc,def\n', 'csv')).toThrow('引号未闭合')
  })
})

describe('serializeI18n', () => {
  const entries = [
    { key: 'a.b', value: '你好' },
    { key: 'c', value: 'x"y' },
  ]
  it('转 JSON', () => {
    expect(serializeI18n(entries, 'json')).toBe('{\n  "a": {\n    "b": "你好"\n  },\n  "c": "x\\"y"\n}')
  })
  it('转 PO', () => {
    expect(serializeI18n(entries, 'po')).toBe('msgid "a.b"\nmsgstr "你好"\n\nmsgid "c"\nmsgstr "x\\"y"\n')
  })
  it('空条目转 PO 得空串', () => {
    expect(serializeI18n([], 'po')).toBe('')
  })
  it('转 YAML', () => {
    expect(serializeI18n(entries, 'yaml')).toBe('a:\n  b: 你好\nc: "x\\"y"\n')
  })
  it('YAML 特殊值加引号', () => {
    expect(
      serializeI18n(
        [
          { key: 'a', value: ' 前空格' },
          { key: 'b', value: '' },
        ],
        'yaml',
      ),
    ).toBe('a: " 前空格"\nb: ""\n')
  })
  it('空条目转 YAML 得空串', () => {
    expect(serializeI18n([], 'yaml')).toBe('')
  })
  it('转 CSV', () => {
    expect(serializeI18n(entries, 'csv')).toBe('key,value\na.b,你好\nc,"x""y"')
  })
  it('未知格式抛错', () => {
    expect(() => serializeI18n(entries, 'xml' as I18nFormat)).toThrow('不支持的格式')
  })
})

describe('convertI18n', () => {
  it('JSON 转 PO 并计数', () => {
    const r = convertI18n('{"a":"甲","b":{"c":"丙"}}', 'json', 'po')
    expect(r.count).toBe(2)
    expect(r.text).toContain('msgid "b.c"')
  })
  it('CSV 转 YAML', () => {
    const r = convertI18n('key,value\na.b,你好\n', 'csv', 'yaml')
    expect(r.text).toBe('a:\n  b: 你好\n')
  })
  it('PO 转 JSON', () => {
    const r = convertI18n('msgid "k"\nmsgstr "v"\n', 'po', 'json')
    expect(r.text).toBe('{\n  "k": "v"\n}')
  })
})
