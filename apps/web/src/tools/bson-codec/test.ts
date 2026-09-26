import { describe, expect, it } from 'vitest'
import { BsonCodecError, decode, encode, toBase64, toHex, transform } from './utils'
import type { BsonCodecInput, BsonCodecOptions } from './schema'

const encodeOptions: BsonCodecOptions = { mode: 'encode', format: 'hex' }
const decodeOptions: BsonCodecOptions = { mode: 'decode', format: 'hex' }

/** 字节数组 → hex，避免手拼十六进制串出错 */
function hexOf(...bytes: number[]): string {
  return toHex(new Uint8Array(bytes))
}

describe('bson-codec / transform', () => {
  it('编码 string 元素用 BSON 规范的经典样例', () => {
    // {"hello":"world"} 的官方字节：16 00 00 00 02 hello\0 06 00 00 00 world\0 \0
    expect(toHex(encode({ hello: 'world' }))).toBe('160000000268656c6c6f0006000000776f726c640000')
  })

  it('编码 int32 / double / bool / null', () => {
    expect(toHex(encode({ n: 1 }))).toBe('0c000000106e000100000000')
    // double 1.5 → IEEE754 LE：00 00 00 00 00 00 f8 3f
    expect(toHex(encode({ d: 1.5 }))).toBe(
      hexOf(0x10, 0, 0, 0, 0x01, 0x64, 0, 0, 0, 0, 0, 0, 0, 0xf8, 0x3f, 0),
    )
    expect(toHex(encode({ b: true }))).toBe('090000000862000100')
    expect(toHex(encode({ z: null }))).toBe('080000000a7a0000')
  })

  it('编码 ObjectId / datetime / int64', () => {
    expect(toHex(encode({ _id: { $oid: '507f1f77bcf86cd799439011' } }))).toBe(
      '16000000075f696400507f1f77bcf86cd79943901100',
    )
    expect(toHex(encode({ t: { $date: 1 } }))).toBe('10000000097400010000000000000000')
    // 9007199254740993 = 0x0020000000000001，小端落盘
    expect(toHex(encode({ big: { $numberLong: '9007199254740993' } }))).toBe(
      '120000001262696700010000000000200000',
    )
  })

  it('编码嵌套文档与数组并能还原', () => {
    const bytes = encode({ a: { b: 1 }, list: [1, 2] })
    const back = decode(bytes).value as Record<string, unknown>
    expect(back['a']).toEqual({ b: 1 })
    expect(back['list']).toEqual([1, 2])
  })

  it('编码 binary 与 subType', () => {
    const bytes = encode({ blob: { $binary: { subType: 0, data: '0a0b' } } })
    const back = decode(bytes).value as Record<string, { $binary: { data: string } }>
    expect(back['blob']?.$binary.data).toBe('0a0b')
  })

  it('编码输出 hex 与 JSON 预览', () => {
    const out = transform({ text: '{"a":1}' }, encodeOptions)
    expect(out).toContain('hex   : 0c0000001061000100000000')
    expect(out).toContain('字节数: 12')
    expect(out).toContain('"a": 1')
  })

  it('解码还原 JSON 并统计类型', () => {
    const bytes = encode({ a: 'hi', n: 1 })
    const out = transform({ text: toHex(bytes) }, decodeOptions)
    expect(out).toContain('"a": "hi"')
    expect(out).toContain('"n": 1')
    expect(out).toContain('string: 1')
    expect(out).toContain('int32: 1')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, encodeOptions)).toBe('')
    expect(transform({ text: '\n  ' }, encodeOptions)).toBe('')
  })

  it('非法 JSON / 非对象顶层抛出 BsonCodecError（异常）', () => {
    expect(() => transform({ text: '{bad' }, encodeOptions)).toThrow(BsonCodecError)
    expect(() => transform({ text: '[1,2]' }, encodeOptions)).toThrow(BsonCodecError)
  })

  it('声明长度与实际不符时报错', () => {
    expect(() => transform({ text: '0f000000106e0001000000ff' }, decodeOptions)).toThrow(
      BsonCodecError,
    )
  })

  it('不支持的元素类型（timestamp 0x11）报错', () => {
    const raw = hexOf(0x10, 0, 0, 0, 0x11, 0x74, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
    expect(() => transform({ text: raw }, decodeOptions)).toThrow(BsonCodecError)
  })

  it('base64 输出与 hex 等价', () => {
    const out = transform({ text: '{"a":1}' }, { mode: 'encode', format: 'base64' })
    expect(out).toContain(`base64: ${toBase64(encode({ a: 1 }))}`)
  })

  it('往返一致：编码后再解出同样的值', () => {
    const source: BsonCodecInput = {
      text: '{"name":"工具库","n":870,"ok":true,"list":[1,2],"nil":null}',
    }
    const bytes = encode(JSON.parse(source.text))
    expect(JSON.stringify(decode(bytes).value)).toBe(JSON.stringify(JSON.parse(source.text)))
  })
})
