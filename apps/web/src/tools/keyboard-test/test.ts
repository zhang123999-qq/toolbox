/**
 * keyboard-test（#832）utils 单测：按键归一化、分区查询、按下集合。
 */
import { describe, expect, it } from 'vitest'
import {
  KEY_ZONES,
  formatKeyLabel,
  normalizeKey,
  trackPressed,
  zoneOfCode,
} from './utils'

describe('normalizeKey', () => {
  it('完整事件提取三字段', () => {
    expect(normalizeKey({ key: 'a', code: 'KeyA', keyCode: 65 })).toEqual({
      key: 'a',
      code: 'KeyA',
      keyCode: 65,
    })
  })
  it('缺字段用兜底值不抛错', () => {
    expect(normalizeKey({})).toEqual({ key: 'Unknown', code: 'Unknown', keyCode: 0 })
  })
  it('类型错误字段用兜底值', () => {
    expect(normalizeKey({ key: 1, code: null, keyCode: 'x' })).toEqual({
      key: 'Unknown',
      code: 'Unknown',
      keyCode: 0,
    })
  })
  it('空对象与 undefined 字段等价', () => {
    expect(normalizeKey({ key: undefined, code: undefined, keyCode: undefined })).toEqual({
      key: 'Unknown',
      code: 'Unknown',
      keyCode: 0,
    })
  })
})

describe('zoneOfCode', () => {
  it('F1 在功能键区', () => {
    expect(zoneOfCode('F1')).toBe('功能键区')
  })
  it('KeyA 在主键盘区', () => {
    expect(zoneOfCode('KeyA')).toBe('主键盘区')
  })
  it('ArrowUp 在编辑键区', () => {
    expect(zoneOfCode('ArrowUp')).toBe('编辑键区')
  })
  it('Numpad0 在数字小键盘', () => {
    expect(zoneOfCode('Numpad0')).toBe('数字小键盘')
  })
  it('ShiftLeft 在修饰键', () => {
    expect(zoneOfCode('ShiftLeft')).toBe('修饰键')
  })
  it('未知 code 返回其他', () => {
    expect(zoneOfCode('NoSuchCode')).toBe('其他')
  })
  it('分区表共 5 个分区且 code 不重复', () => {
    expect(KEY_ZONES).toHaveLength(5)
    const all = KEY_ZONES.flatMap((z) => z.codes)
    expect(new Set(all).size).toBe(all.length)
  })
})

describe('trackPressed', () => {
  it('按下加入集合', () => {
    const next = trackPressed(new Set(), 'KeyA', true)
    expect(next.has('KeyA')).toBe(true)
  })
  it('松开移出集合', () => {
    const next = trackPressed(new Set(['KeyA']), 'KeyA', false)
    expect(next.has('KeyA')).toBe(false)
  })
  it('重复按下不产生重复', () => {
    const next = trackPressed(new Set(['KeyA']), 'KeyA', true)
    expect(next.size).toBe(1)
  })
  it('松开未按下的键不影响集合', () => {
    const next = trackPressed(new Set(['KeyA']), 'KeyB', false)
    expect(next).toEqual(new Set(['KeyA']))
  })
  it('不修改传入的集合', () => {
    const prev = new Set(['KeyA'])
    trackPressed(prev, 'KeyB', true)
    expect(prev.has('KeyB')).toBe(false)
  })
})

describe('formatKeyLabel', () => {
  it('输出包含键名 code keyCode 分区', () => {
    const label = formatKeyLabel({ key: 'Enter', code: 'Enter', keyCode: 13 })
    expect(label).toContain('键名「Enter」')
    expect(label).toContain('code Enter')
    expect(label).toContain('keyCode 13')
    expect(label).toContain('分区：主键盘区')
  })
  it('未知 code 分区显示其他', () => {
    expect(formatKeyLabel({ key: '?', code: 'X', keyCode: 0 })).toContain('分区：其他')
  })
})
