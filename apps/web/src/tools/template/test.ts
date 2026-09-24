import { describe, expect, it } from 'vitest'
import { parseVars, splitTemplate, transform } from './utils'

describe('template / splitTemplate', () => {
  it('按独占一行的 --- 拆分', () => {
    const parts = splitTemplate('a\n---\nb=1')
    expect(parts.template).toBe('a')
    expect(parts.varsText).toBe('b=1')
  })

  it('没有分隔行时整段都是模板', () => {
    const parts = splitTemplate('a\nb')
    expect(parts.template).toBe('a\nb')
    expect(parts.varsText).toBe('')
  })
})

describe('template / parseVars', () => {
  it('解析 key=value，值两端空白去掉、配对引号剥掉', () => {
    expect(parseVars('a=1\nb="two"\nc=  three  ')).toEqual({ a: '1', b: 'two', c: 'three' })
  })

  it('引号内的首尾空格会被保留', () => {
    expect(parseVars('a="  x  "')).toEqual({ a: '  x  ' })
  })

  it('忽略空行与没有等号的行', () => {
    expect(parseVars('a=1\n\nno-eq\n=2')).toEqual({ a: '1' })
  })
})

describe('template / transform', () => {
  const base = { syntax: 'mustache', keepMissing: true } as const

  it('mustache 占位符被替换', () => {
    const out = transform({ text: 'Hi {{name}}!\n---\nname=Bob' }, base)
    expect(out).toBe('Hi Bob!')
  })

  it('dollar 占位符被替换', () => {
    // dollar 占位符用拼接构造，避开模板字面量的插值语法
    const out = transform(
      { text: 'Hi $' + '{name}!\n---\nname=Bob' },
      { syntax: 'dollar', keepMissing: true },
    )
    expect(out).toBe('Hi Bob!')
  })

  it('未提供的变量默认保留原样', () => {
    expect(transform({ text: 'Hi {{name}}!' }, base)).toBe('Hi {{name}}!')
  })

  it('keepMissing 关闭时未提供的变量替换为空', () => {
    expect(transform({ text: 'Hi {{name}}!' }, { syntax: 'mustache', keepMissing: false })).toBe(
      'Hi !',
    )
  })

  it('同一变量可重复出现', () => {
    const out = transform({ text: '{{a}}-{{a}}\n---\na=x' }, base)
    expect(out).toBe('x-x')
  })

  it('值里含等号只按第一个等号切分', () => {
    const out = transform({ text: '{{u}}\n---\nu=a=b' }, base)
    expect(out).toBe('a=b')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, base)).toBe('')
  })
})
