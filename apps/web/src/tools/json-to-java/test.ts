import { describe, expect, it } from 'vitest'
import { JsonToJavaError, transform } from './utils'
import type { JsonToJavaInput, JsonToJavaOptions } from './schema'

const baseOptions: JsonToJavaOptions = { style: 'pojo', mode: 'public', indent: '2' }

describe('json-to-java / transform', () => {
  it('标量对象生成带 getter/setter 的 POJO', () => {
    const input: JsonToJavaInput = { text: '{"a":1}' }
    const out = transform(input, baseOptions)
    expect(out).toContain('public class Root {')
    expect(out).toContain('private long a;')
    expect(out).toContain('public long getA() {')
    expect(out).toContain('public void setA(long a) {')
  })

  it('浮点映射 double、布尔映射 boolean、字符串映射 String', () => {
    const out = transform({ text: '{"d":1.5,"b":true,"s":"x"}' }, baseOptions)
    expect(out).toContain('private double d;')
    expect(out).toContain('private boolean b;')
    expect(out).toContain('private String s;')
  })

  it('嵌套对象拆成独立类且子类先声明', () => {
    const out = transform({ text: '{"meta":{"stars":870}}' }, baseOptions)
    expect(out.indexOf('class Meta')).toBeLessThan(out.indexOf('class Root'))
    expect(out).toContain('private Meta meta;')
  })

  it('record 风格输出紧凑 record，不生成 getter/setter', () => {
    const out = transform({ text: '{"a":1,"b":"x"}' }, { ...baseOptions, style: 'record' })
    expect(out).toBe('public record Root(long a, String b) {}\n')
  })

  it('lombok 风格输出 @Data 且不生成 getter/setter', () => {
    const out = transform({ text: '{"meta":{"stars":870}}' }, { ...baseOptions, style: 'lombok' })
    expect(out).toContain('@Data')
    expect(out).not.toContain('getStars')
  })

  it('mode 为 package 时省略 public', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, mode: 'package' })
    expect(out).toContain('class Root {')
    expect(out).not.toContain('public class Root')
  })

  it('对象数组元素缺失字段使用包装类型 Long', () => {
    const out = transform({ text: '{"items":[{"x":1},{"y":2}]}' }, baseOptions)
    expect(out).toContain('private Long x;')
    expect(out).toContain('private Long y;')
  })

  it('标量数组生成 Java 数组类型', () => {
    const out = transform({ text: '{"tags":["a","b"]}' }, baseOptions)
    expect(out).toContain('private String[] tags;')
  })

  it('null 值映射 Object', () => {
    const out = transform({ text: '{"note":null}' }, baseOptions)
    expect(out).toContain('private Object note;')
  })

  it('无可用字段名时回退为 fieldN', () => {
    const out = transform({ text: '{"工具":1}' }, baseOptions)
    expect(out).toContain('private long field1;')
  })

  it('indent 为 tab 时用制表符缩进', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, indent: 'tab' })
    expect(out).toContain('\tprivate long a;')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
    expect(transform({ text: '  \n\t ' }, baseOptions)).toBe('')
  })

  it('非法 JSON 抛出 JsonToJavaError（异常）', () => {
    expect(() => transform({ text: '{"a":' }, baseOptions)).toThrow(JsonToJavaError)
  })

  it('根节点不是对象时抛出 JsonToJavaError（异常）', () => {
    expect(() => transform({ text: '123' }, baseOptions)).toThrow(JsonToJavaError)
  })

  it('超长输入抛出 JsonToJavaError（异常）', () => {
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToJavaError,
    )
  })
})
