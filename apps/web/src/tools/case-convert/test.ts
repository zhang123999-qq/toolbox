import { describe, expect, it } from 'vitest'
import { convert, transform } from './utils'
import type { CaseConvertOptions } from './schema'

const upper: CaseConvertOptions = { mode: 'upper' }
const lower: CaseConvertOptions = { mode: 'lower' }
const cap: CaseConvertOptions = { mode: 'capitalize' }
const title: CaseConvertOptions = { mode: 'title' }

describe('case-convert / convert', () => {
  it('全大写', () => {
    expect(convert('Hello World', 'upper')).toBe('HELLO WORLD')
  })

  it('全小写', () => {
    expect(convert('Hello World', 'lower')).toBe('hello world')
  })

  it('首字母大写，其余保持原样', () => {
    expect(convert('hello WORLD', 'capitalize')).toBe('Hello WORLD')
  })

  it('标题化：每词首字母大写、其余小写', () => {
    expect(convert('hello world', 'title')).toBe('Hello World')
  })

  it('中文字符不受影响', () => {
    expect(convert('工具库 toolbox', 'upper')).toBe('工具库 TOOLBOX')
  })

  it('未知模式回落为全大写', () => {
    expect(convert('abc', 'other')).toBe('ABC')
  })
})

describe('case-convert / transform', () => {
  it('按选项输出', () => {
    expect(transform({ text: 'abc' }, upper)).toBe('ABC')
    expect(transform({ text: 'ABC' }, lower)).toBe('abc')
  })

  it('首字母大写模式只改首字符', () => {
    expect(transform({ text: 'hello WORLD' }, cap)).toBe('Hello WORLD')
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, upper)).toBe('')
  })

  it('纯空白输入原样返回（保留内容不误删）', () => {
    expect(transform({ text: '  ' }, title)).toBe('  ')
  })
})
