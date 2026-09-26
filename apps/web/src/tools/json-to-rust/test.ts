import { describe, expect, it } from 'vitest'
import { JsonToRustError, transform } from './utils'
import type { JsonToRustOptions } from './schema'

const baseOptions: JsonToRustOptions = { mode: 'serde', style: 'snake', indent: '2' }

describe('json-to-rust / transform', () => {
  it('标量对象生成带 serde 派生的 struct', () => {
    const out = transform({ text: '{"a":1}' }, baseOptions)
    expect(out).toContain('#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]')
    expect(out).toContain('pub struct Root {')
    expect(out).toContain('pub a: i64,')
  })

  it('类型映射：String/bool/f64', () => {
    const out = transform({ text: '{"s":"x","b":true,"d":1.5}' }, baseOptions)
    expect(out).toContain('pub s: String,')
    expect(out).toContain('pub b: bool,')
    expect(out).toContain('pub d: f64,')
  })

  it('camelCase 键转 snake_case 并配 rename_all', () => {
    const out = transform({ text: '{"userId":1}' }, baseOptions)
    expect(out).toContain('#[serde(rename_all = "camelCase")]')
    expect(out).toContain('pub user_id: i64,')
  })

  it('嵌套对象拆成独立 struct 且子类先声明', () => {
    const out = transform({ text: '{"profile":{"isVip":true}}' }, baseOptions)
    expect(out.indexOf('struct Profile')).toBeLessThan(out.indexOf('struct Root'))
    expect(out).toContain('pub profile: Profile,')
  })

  it('数组与对象数组', () => {
    expect(transform({ text: '{"tags":["a"]}' }, baseOptions)).toContain('pub tags: Vec<String>,')
    const out = transform({ text: '{"items":[{"x":1}]}' }, baseOptions)
    expect(out).toContain('pub items: Vec<Item>,')
  })

  it('null 值映射 serde_json::Value', () => {
    expect(transform({ text: '{"note":null}' }, baseOptions)).toContain(
      'pub note: serde_json::Value,',
    )
  })

  it('数组多条样本缺失字段映射 Option<i64>', () => {
    const out = transform({ text: '{"items":[{"x":1},{"y":2}]}' }, baseOptions)
    expect(out).toContain('pub x: Option<i64>,')
    expect(out).toContain('pub y: Option<i64>,')
  })

  it('plain 模式不带 serde 派生', () => {
    const out = transform({ text: '{"a":1}' }, { ...baseOptions, mode: 'plain' })
    expect(out).toBe('#[derive(Debug, Clone)]\npub struct Root {\n  pub a: i64,\n}\n')
  })

  it('keep 模式对改名的字段加逐字段 serde(rename)', () => {
    const out = transform({ text: '{"userId":1}' }, { ...baseOptions, style: 'keep' })
    expect(out).toContain('#[serde(rename = "userId")]')
    expect(out).toContain('pub user_id: i64,')
    expect(out).not.toContain('rename_all')
  })

  it('关键字字段名加 r# 前缀', () => {
    const out = transform({ text: '{"type":1}' }, baseOptions)
    expect(out).toContain('pub r#type: i64,')
  })

  it('indent tab 用制表符缩进', () => {
    expect(transform({ text: '{"a":1}' }, { ...baseOptions, indent: 'tab' })).toContain(
      '\tpub a: i64,',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, baseOptions)).toBe('')
  })

  it('非法 JSON 与非标量根抛错（异常）', () => {
    expect(() => transform({ text: '{x' }, baseOptions)).toThrow(JsonToRustError)
    expect(() => transform({ text: '1' }, baseOptions)).toThrow(JsonToRustError)
    expect(() => transform({ text: `{"a":"${'x'.repeat(2_000_000)}"}` }, baseOptions)).toThrow(
      JsonToRustError,
    )
  })
})
