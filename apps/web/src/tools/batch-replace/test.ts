import { describe, expect, it } from 'vitest'
import { parseRules, splitRules, transform } from './utils'

describe('batch-replace / splitRules', () => {
  it('按独占一行的 --- 拆分', () => {
    const parts = splitRules('body\n---\na=>1')
    expect(parts.body).toBe('body')
    expect(parts.rulesText).toBe('a=>1')
  })

  it('没有分隔行时整段都是正文', () => {
    const parts = splitRules('a\nb')
    expect(parts.body).toBe('a\nb')
    expect(parts.rulesText).toBe('')
  })
})

describe('batch-replace / parseRules', () => {
  it('按第一个 => 切分，替换串里可以再有 =>', () => {
    expect(parseRules('a=>1\nb=>x=>y')).toEqual([
      { find: 'a', replace: '1' },
      { find: 'b', replace: 'x=>y' },
    ])
  })

  it('忽略空行、没有 => 的行与空查找串', () => {
    expect(parseRules('\nno-sep\n=>1\nb=>2')).toEqual([{ find: 'b', replace: '2' }])
  })
})

describe('batch-replace / transform', () => {
  const base = { useRegex: false, ignoreCase: false } as const

  it('多组规则依次生效', () => {
    const out = transform({ text: '苹果和香蕉\n---\n苹果=>apple\n香蕉=>banana' }, base)
    expect(out).toBe('apple和banana')
  })

  it('替换串为空等于删除', () => {
    expect(transform({ text: 'aXbXc\n---\nX=>' }, base)).toBe('abc')
  })

  it('正则模式支持分组引用', () => {
    const out = transform({ text: 'a1 b22\n---\n(\\d+)=>[$1]' }, { ...base, useRegex: true })
    expect(out).toBe('a[1] b[22]')
  })

  it('字面量模式下元字符不当正则解析', () => {
    expect(transform({ text: 'a.b\n---\n.=>X' }, base)).toBe('aXb')
  })

  it('字面量 + 忽略大小写', () => {
    const out = transform({ text: 'Apple apple\n---\napple=>苹果' }, { ...base, ignoreCase: true })
    expect(out).toBe('苹果 苹果')
  })

  it('非法正则会抛错（由模板捕获展示）', () => {
    expect(() => transform({ text: 'a\n---\n(=>x' }, { ...base, useRegex: true })).toThrow()
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
