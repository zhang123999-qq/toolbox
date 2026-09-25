import { describe, expect, it } from 'vitest'
import { decodeOctal, encodeOctal, transform } from './utils'

const toByteOctal = { direction: 'encode', mode: 'byte' } as const
const fromByteOctal = { direction: 'decode', mode: 'byte' } as const
const fromCharOctal = { direction: 'decode', mode: 'char' } as const

describe('octal / 编码', () => {
  it('byte 模式按 UTF-8 字节展开（与已知值一致）', () => {
    expect(encodeOctal('中', 'byte')).toBe('344 270 255')
  })

  it('byte 模式对 emoji 展开成 4 个字节', () => {
    expect(encodeOctal('😀', 'byte')).toBe('360 237 230 200')
  })

  it('ASCII 在两种模式下结果相同', () => {
    expect(encodeOctal('AB', 'byte')).toBe('101 102')
    expect(encodeOctal('AB', 'char')).toBe('101 102')
  })

  it('char 模式按 UTF-16 码元展开', () => {
    expect(encodeOctal('中', 'char')).toBe('47055')
  })

  it('每个值至少补齐 3 位', () => {
    expect(encodeOctal('A', 'byte')).toBe('101')
  })
})

describe('octal / 解码', () => {
  it('byte 模式还原 UTF-8 文本', () => {
    expect(decodeOctal('344 270 255', 'byte')).toBe('中')
  })

  it('char 模式还原单个码元', () => {
    expect(decodeOctal('47055', 'char')).toBe('中')
  })

  it('换成换行/多余空白分隔也能解析', () => {
    expect(decodeOctal('344\n270\t 255 ', 'byte')).toBe('中')
  })
})

describe('octal / transform', () => {
  it('按方向执行', () => {
    expect(transform({ text: '中' }, toByteOctal)).toBe('344 270 255')
    expect(transform({ text: '344 270 255' }, fromByteOctal)).toBe('中')
  })

  it('中英混排与 emoji 在两种模式下都往返一致', () => {
    const text = '中Emoji🚀 ok'
    for (const mode of ['char', 'byte'] as const) {
      expect(decodeOctal(encodeOctal(text, mode), mode)).toBe(text)
    }
  })

  it('空串返回空串（边界）', () => {
    expect(transform({ text: '' }, toByteOctal)).toBe('')
    expect(transform({ text: '' }, fromByteOctal)).toBe('')
  })

  it('含非八进制字符时报错', () => {
    expect(() => transform({ text: '8 9' }, fromByteOctal)).toThrow(/含非八进制字符/)
  })

  it('byte 模式超出单字节范围时报错', () => {
    expect(() => transform({ text: '400' }, fromByteOctal)).toThrow(/超出单字节范围/)
  })

  it('char 模式超出码元范围时报错', () => {
    expect(() => transform({ text: '200000' }, fromCharOctal)).toThrow(/超出 UTF-16 码元范围/)
  })

  it('字节序列不是合法 UTF-8 时报错', () => {
    expect(() => transform({ text: '377' }, fromByteOctal)).toThrow(/不是合法的 UTF-8/)
  })
})
