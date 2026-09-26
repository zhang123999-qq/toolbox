import { describe, expect, it } from 'vitest'
import { JsonToCsvError, transform } from './utils'
import type { JsonToCsvOptions } from './schema'

const baseOptions: JsonToCsvOptions = {
  delimiter: 'comma',
  withHeader: true,
  quote: 'needed',
  style: 'flatten',
}

describe('json-to-csv / transform', () => {
  it('对象数组生成表头与数据行', () => {
    expect(transform({ text: '[{"a":1,"b":"x"},{"a":2,"b":"y"}]' }, baseOptions)).toBe(
      'a,b\n1,x\n2,y',
    )
  })

  it('单对象包成一行', () => {
    expect(transform({ text: '{"a":1,"b":"x"}' }, baseOptions)).toBe('a,b\n1,x')
  })

  it('flatten 风格摊平嵌套对象与数组', () => {
    expect(transform({ text: '[{"m":{"x":1},"t":["p","q"]}]' }, baseOptions)).toBe(
      'm.x,t[0],t[1]\n1,p,q',
    )
  })

  it('不同行列集合取并集，缺失列留空', () => {
    expect(transform({ text: '[{"a":1},{"b":2}]' }, baseOptions)).toBe('a,b\n1,\n,2')
  })

  it('null 与空容器输出空单元格', () => {
    expect(transform({ text: '[{"a":null,"b":[],"c":{}}]' }, baseOptions)).toBe('a,b,c\n,,')
  })

  it('含分隔符 / 引号 / 换行时按需加引号并双写引号', () => {
    const out = transform({ text: '[{"a":"x,y","b":"he said \\"hi\\""}]' }, baseOptions)
    expect(out).toBe('a,b\n"x,y","he said ""hi"""')
  })

  it('quote=all 全部加引号', () => {
    const out = transform({ text: '[{"a":1}]' }, { ...baseOptions, quote: 'all' })
    expect(out).toBe('"a"\n"1"')
  })

  it('quote=none 不加引号', () => {
    const out = transform({ text: '[{"a":"x,y"}]' }, { ...baseOptions, quote: 'none' })
    expect(out).toBe('a\nx,y')
  })

  it('withHeader=false 不输出表头', () => {
    expect(transform({ text: '[{"a":1}]' }, { ...baseOptions, withHeader: false })).toBe('1')
  })

  it('分号 / Tab / 竖线分隔符', () => {
    expect(transform({ text: '[{"a":1,"b":2}]' }, { ...baseOptions, delimiter: 'semicolon' })).toBe(
      'a;b\n1;2',
    )
    expect(transform({ text: '[{"a":1,"b":2}]' }, { ...baseOptions, delimiter: 'tab' })).toBe(
      'a\tb\n1\t2',
    )
    expect(transform({ text: '[{"a":1,"b":2}]' }, { ...baseOptions, delimiter: 'pipe' })).toBe(
      'a|b\n1|2',
    )
  })

  it('nested 风格把非标量值 JSON 序列化进一格', () => {
    const out = transform(
      { text: '[{"m":{"x":1},"t":[1,2]}]' },
      { ...baseOptions, style: 'nested' },
    )
    expect(out).toBe('m,t\n"{""x"":1}","[1,2]"')
  })

  it('空输入与空数组返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '[]' }, baseOptions)).toBe('')
  })

  it('非法 JSON / 标量数组抛错（异常）', () => {
    expect(() => transform({ text: '{x' }, baseOptions)).toThrow(JsonToCsvError)
    expect(() => transform({ text: '[1,2]' }, baseOptions)).toThrow(JsonToCsvError)
    expect(() => transform({ text: '"s"' }, baseOptions)).toThrow(JsonToCsvError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToCsvError,
    )
  })
})
