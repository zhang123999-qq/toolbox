import { describe, expect, it } from 'vitest'
import { convert, tokenize, transform } from './utils'
import type { NamingConvertOptions } from './schema'

const camel: NamingConvertOptions = { mode: 'camel' }
const pascal: NamingConvertOptions = { mode: 'pascal' }
const snake: NamingConvertOptions = { mode: 'snake' }
const kebab: NamingConvertOptions = { mode: 'kebab' }
const constant: NamingConvertOptions = { mode: 'constant' }

describe('naming-convert / tokenize', () => {
  it('按下划线与中划线切分', () => {
    expect(tokenize('hello_world')).toEqual(['hello', 'world'])
    expect(tokenize('hello-world')).toEqual(['hello', 'world'])
  })

  it('按大小写边界切分', () => {
    expect(tokenize('helloWorld')).toEqual(['hello', 'world'])
    expect(tokenize('HTTPServer')).toEqual(['http', 'server'])
  })

  it('数字与字母相邻时并入同一词', () => {
    expect(tokenize('userID2Name')).toEqual(['user', 'id2', 'name'])
  })
})

describe('naming-convert / convert', () => {
  it('驼峰：首词小写，其后首字母大写', () => {
    expect(convert('hello world', 'camel')).toBe('helloWorld')
  })

  it('帕斯卡：全部首字母大写', () => {
    expect(convert('hello world', 'pascal')).toBe('HelloWorld')
  })

  it('下划线与中划线', () => {
    expect(convert('HelloWorld', 'snake')).toBe('hello_world')
    expect(convert('HelloWorld', 'kebab')).toBe('hello-world')
  })

  it('常量：下划线加全大写', () => {
    expect(convert('hello world', 'constant')).toBe('HELLO_WORLD')
  })

  it('空串返回空串（边界）', () => {
    expect(convert('', 'camel')).toBe('')
  })
})

describe('naming-convert / transform', () => {
  it('逐行转换并保留空行', () => {
    expect(transform({ text: 'hello world\n\ntool box' }, camel)).toBe('helloWorld\n\ntoolBox')
  })

  it('帕斯卡 / 中划线 / 常量模式逐行生效', () => {
    expect(transform({ text: 'hello world' }, pascal)).toBe('HelloWorld')
    expect(transform({ text: 'hello world' }, kebab)).toBe('hello-world')
    expect(transform({ text: 'hello world' }, constant)).toBe('HELLO_WORLD')
  })

  it('纯空白输入返回空串（边界）', () => {
    expect(transform({ text: '  ' }, snake)).toBe('')
  })
})
