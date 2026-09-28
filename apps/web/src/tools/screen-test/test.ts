/**
 * screen-test（#834）utils 单测：模式定义、样式生成、循环切换。
 */
import { describe, expect, it } from 'vitest'
import {
  TEST_PATTERNS,
  cyclePattern,
  getPattern,
  patternIds,
  patternStyle,
} from './utils'

describe('TEST_PATTERNS', () => {
  it('共 8 种模式且 id 不重复', () => {
    expect(TEST_PATTERNS).toHaveLength(8)
    expect(new Set(TEST_PATTERNS.map((p) => p.id)).size).toBe(8)
  })
  it('每种模式含中英文名与提示', () => {
    for (const p of TEST_PATTERNS) {
      expect(p.name.length).toBeGreaterThan(0)
      expect(p.nameEn.length).toBeGreaterThan(0)
      expect(p.hint.length).toBeGreaterThan(0)
    }
  })
})

describe('getPattern', () => {
  it('red 返回红色模式', () => {
    expect(getPattern('red').name).toBe('红色')
  })
  it('未知 id 抛中文错误', () => {
    expect(() => getPattern('nope')).toThrow('未知测试图模式：nope')
  })
})

describe('patternStyle', () => {
  it('纯色返回 backgroundColor', () => {
    expect(patternStyle('red')).toEqual({ backgroundColor: '#ff0000' })
    expect(patternStyle('green')).toEqual({ backgroundColor: '#00ff00' })
    expect(patternStyle('blue')).toEqual({ backgroundColor: '#0000ff' })
    expect(patternStyle('white')).toEqual({ backgroundColor: '#ffffff' })
    expect(patternStyle('black')).toEqual({ backgroundColor: '#000000' })
  })
  it('灰阶返回渐变背景', () => {
    const s = patternStyle('gray')
    expect(s.backgroundImage).toContain('linear-gradient')
    expect(s.backgroundImage).toContain('#000000')
    expect(s.backgroundImage).toContain('#ffffff')
  })
  it('网格返回网格背景与尺寸', () => {
    const s = patternStyle('grid')
    expect(s.backgroundImage).toContain('linear-gradient')
    expect(s.backgroundSize).toBe('40px 40px')
  })
  it('渐变返回彩虹渐变', () => {
    expect(patternStyle('gradient').backgroundImage).toContain('#ff0000')
  })
  it('未知 id 抛中文错误', () => {
    expect(() => patternStyle('nope')).toThrow('未知测试图模式：nope')
  })
})

describe('cyclePattern', () => {
  const ids = ['red', 'green', 'blue']
  it('顺序切换', () => {
    expect(cyclePattern(ids, 'red')).toBe('green')
    expect(cyclePattern(ids, 'green')).toBe('blue')
  })
  it('末尾回到开头', () => {
    expect(cyclePattern(ids, 'blue')).toBe('red')
  })
  it('当前不在列表中从第一个开始', () => {
    expect(cyclePattern(ids, 'nope')).toBe('red')
  })
  it('空列表抛中文错误', () => {
    expect(() => cyclePattern([], 'red')).toThrow('模式列表为空')
  })
})

describe('patternIds', () => {
  it('与 TEST_PATTERNS 一致', () => {
    expect(patternIds()).toEqual(TEST_PATTERNS.map((p) => p.id))
  })
})
