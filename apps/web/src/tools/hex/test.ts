import { describe, expect, it } from 'vitest'
import { decodeHex, encodeHex, transform } from './utils'

const none = { direction: 'encode', separator: 'none', uppercase: false } as const
const space = { direction: 'encode', separator: 'space', uppercase: false } as const
const hyphen = { direction: 'encode', separator: 'hyphen', uppercase: false } as const
const prefixed = { direction: 'encode', separator: '0x', uppercase: false } as const
const upper = { direction: 'encode', separator: 'space', uppercase: true } as const
const dec = { direction: 'decode', separator: 'space', uppercase: false } as const

describe('hex / encode', () => {
  it('ASCII 编码（与已知值一致）', () => {
    expect(encodeHex('hello', 'none', false)).toBe('68656c6c6f')
  })

  it('中文按 UTF-8 字节编码', () => {
    expect(encodeHex('中', 'none', false)).toBe('e4b8ad')
  })

  it('分节写法：空格 / 连字符 / 0x 前缀', () => {
    expect(encodeHex('hi', 'space', false)).toBe('68 69')
    expect(encodeHex('hi', 'hyphen', false)).toBe('68-69')
    expect(encodeHex('hi', '0x', false)).toBe('0x68 0x69')
  })

  it('uppercase 选项输出大写字母', () => {
    expect(encodeHex('Hi 中', 'space', true)).toBe('48 69 20 E4 B8 AD')
  })
})

describe('hex / decode', () => {
  it('还原 ASCII', () => {
    expect(decodeHex('68656c6c6f')).toBe('hello')
  })

  it('忽略空格、连字符与逗号分隔', () => {
    expect(decodeHex('68 69')).toBe('hi')
    expect(decodeHex('68-69')).toBe('hi')
    expect(decodeHex('68, 69')).toBe('hi')
  })

  it('忽略 0x / \\x 前缀', () => {
    expect(decodeHex('0x68 0x69')).toBe('hi')
    expect(decodeHex('\\x68\\x69')).toBe('hi')
  })

  it('大写十六进制也能还原', () => {
    expect(decodeHex('E4 B8 AD')).toBe('中')
  })

  it('emoji（四字节 UTF-8）往返不丢字符', () => {
    expect(decodeHex('f09f9a80')).toBe('🚀')
  })
})

describe('hex / transform', () => {
  it('按选项方向执行', () => {
    expect(transform({ text: 'hi' }, none)).toBe('6869')
    expect(transform({ text: '6869' }, dec)).toBe('hi')
  })

  it('uppercase 选项经 transform 生效', () => {
    expect(transform({ text: '中' }, upper)).toBe('E4 B8 AD')
  })

  it('四种分隔写法都能往返一致', () => {
    const text = 'Toolbox 工具库 🚀'
    for (const options of [none, space, hyphen, prefixed]) {
      expect(transform({ text: transform({ text }, options) }, dec)).toBe(text)
    }
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, none)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非十六进制字符抛出可读错误', () => {
    expect(() => transform({ text: 'zz' }, dec)).toThrow(/非十六进制字符/)
  })

  it('奇数个字符抛出可读错误', () => {
    expect(() => transform({ text: 'abc' }, dec)).toThrow(/奇数/)
  })

  it('还原结果不是合法 UTF-8 时报错而不是产出乱码', () => {
    expect(() => transform({ text: 'ff' }, dec)).toThrow(/合法的 UTF-8/)
  })
})
