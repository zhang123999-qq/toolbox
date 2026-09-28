/**
 * i18n-diff（#727）utils 单测：双语 JSON 差异分析。
 */
import { describe, expect, it } from 'vitest'
import { diffI18n, formatDiffResult } from './utils'

const BASE = JSON.stringify({ a: '甲', b: '乙', c: { d: '丁' }, e: '戊' })

describe('diffI18n 基础', () => {
  it('全翻译无差异', () => {
    const r = diffI18n(BASE, JSON.stringify({ a: 'A', b: 'B', c: { d: 'D' }, e: 'E' }))
    expect(r.missingKeys).toEqual([])
    expect(r.extraKeys).toEqual([])
    expect(r.emptyValues).toEqual([])
    expect(r.untranslatedKeys).toEqual([])
    expect(r.totalBase).toBe(4)
    expect(r.totalTarget).toBe(4)
    expect(r.translatedCount).toBe(4)
    expect(r.completionRate).toBe(100)
    expect(r.items).toEqual([])
  })
  it('四类差异一次检出', () => {
    const target = JSON.stringify({
      a: 'A', // 已翻译
      b: '', // 空值
      c: { d: '丁' }, // 未翻译
      z: '多', // 多余
      // e 缺失
    })
    const r = diffI18n(BASE, target)
    expect(r.missingKeys).toEqual(['e'])
    expect(r.emptyValues).toEqual(['b'])
    expect(r.untranslatedKeys).toEqual(['c.d'])
    expect(r.extraKeys).toEqual(['z'])
    expect(r.translatedCount).toBe(1)
    expect(r.completionRate).toBe(25)
    expect(r.items).toHaveLength(4)
    expect(r.items.map((i) => i.kind)).toEqual(['empty', 'untranslated', 'missing', 'extra'])
  })
  it('基准为空时完成率为 100', () => {
    const r = diffI18n('{}', '{"a":"A"}')
    expect(r.completionRate).toBe(100)
    expect(r.extraKeys).toEqual(['a'])
    expect(r.translatedCount).toBe(0)
  })
  it('完成率保留一位小数', () => {
    const r = diffI18n('{"a":"1","b":"2","c":"3"}', '{"a":"A"}')
    expect(r.completionRate).toBe(33.3)
  })
})

describe('diffI18n 输入校验', () => {
  it('空输入抛中文错', () => {
    expect(() => diffI18n('', BASE)).toThrow('请粘贴基准 JSON')
    expect(() => diffI18n(BASE, '  ')).toThrow('请粘贴目标 JSON')
  })
  it('非法 JSON 抛中文错', () => {
    expect(() => diffI18n('{x', BASE)).toThrow('基准 JSON 解析失败')
    expect(() => diffI18n(BASE, '[1]')).toThrow('输入必须是 JSON 对象')
  })
  it('顶层数组抛错', () => {
    expect(() => diffI18n('[]', BASE)).toThrow('输入必须是 JSON 对象')
  })
  it('数组值抛错', () => {
    expect(() => diffI18n('{"a":[1]}', BASE)).toThrow('暂不支持数组')
  })
  it('空值抛错', () => {
    expect(() => diffI18n('{"a":null}', BASE)).toThrow('值为空')
  })
  it('数字/布尔叶子转字符串', () => {
    const r = diffI18n('{"a":1,"b":false}', '{"a":"1","b":"x"}')
    expect(r.untranslatedKeys).toEqual(['a'])
    expect(r.translatedCount).toBe(1)
  })
})

describe('formatDiffResult', () => {
  it('渲染统计与四类明细', () => {
    const r = diffI18n(BASE, '{"a":"","z":"多"}')
    const text = formatDiffResult(r)
    expect(text).toContain('基准条目：4')
    expect(text).toContain('缺失（3）：')
    expect(text).toContain('- b')
    expect(text).toContain('空值（1）：')
    expect(text).toContain('多余（1）：')
    expect(text).toContain('- z')
    expect(text).toContain('未翻译（0）：')
    expect(text).toContain('无')
  })
  it('完全一致输出提示', () => {
    const r = diffI18n(BASE, JSON.stringify({ a: 'A', b: 'B', c: { d: 'D' }, e: 'E' }))
    expect(formatDiffResult(r)).toContain('完全一致')
  })
})
