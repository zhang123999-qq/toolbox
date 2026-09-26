import { describe, expect, it } from 'vitest'
import { MessagePackError, decode, encode, toBase64, toHex, transform } from './utils'
import type { MessagePackInput, MessagePackOptions } from './schema'

const encodeOptions: MessagePackOptions = { mode: 'encode', format: 'hex' }
const decodeOptions: MessagePackOptions = { mode: 'decode', format: 'hex' }

describe('messagepack / transform', () => {
  it('编码 nil / bool / int 用最短形式', () => {
    expect(toHex(encode(null))).toBe('c0')
    expect(toHex(encode(true))).toBe('c3')
    expect(toHex(encode(false))).toBe('c2')
    expect(toHex(encode(1))).toBe('01')
    expect(toHex(encode(127))).toBe('7f')
    expect(toHex(encode(128))).toBe('cc80')
    expect(toHex(encode(-1))).toBe('ff')
    expect(toHex(encode(-33))).toBe('d0df')
    expect(toHex(encode(1.5))).toBe('cb3ff8000000000000')
  })

  it('编码 str / array / map 与官方 spec 一致', () => {
    expect(toHex(encode('abc'))).toBe('a3616263')
    expect(toHex(encode([1, 2, 3]))).toBe('93010203')
    expect(toHex(encode({ a: 1 }))).toBe('81a16101')
  })

  it('编码 bin / ext / timestamp 三类扩展类型', () => {
    expect(toHex(encode({ $bin: '0a0b' }))).toBe('c4020a0b')
    expect(toHex(encode({ $ext: { type: 1, data: '0a' } }))).toBe('d4010a')
    expect(toHex(encode({ $ts: 1 }))).toBe('d6ff00000001')
    expect(toHex(encode({ $ts: { sec: 1, nsec: 2 } }))).toBe('d7ff0000000800000001')
  })

  it('编码输出 hex 与 JSON 预览', () => {
    const out = transform({ text: '{"a":1}' }, encodeOptions)
    expect(out).toContain('hex   : 81a16101')
    expect(out).toContain('字节数: 4')
    expect(out).toContain('"a": 1')
  })

  it('解码还原值并给出类型统计', () => {
    const out = transform({ text: '82a16101a162a3616263' }, decodeOptions)
    expect(out).toContain('"a": 1')
    expect(out).toContain('"b": "abc"')
    expect(out).toContain('map: 1')
    expect(out).toContain('str: 3')
    expect(out).toContain('int: 1')
  })

  it('base64 与 hex 两条路都能解', () => {
    const base64 = toBase64(encode({ a: 1 }))
    expect(transform({ text: base64 }, { mode: 'decode', format: 'base64' })).toContain('"a": 1')
    expect(transform({ text: '81a16101' }, decodeOptions)).toContain('"a": 1')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '' }, encodeOptions)).toBe('')
    expect(transform({ text: ' \n\t ' }, encodeOptions)).toBe('')
  })

  it('非法 JSON 抛出 MessagePackError（异常）', () => {
    expect(() => transform({ text: '{bad' }, encodeOptions)).toThrow(MessagePackError)
  })

  it('非法字节串与多余内容都报错', () => {
    expect(() => transform({ text: '81a1610100' }, decodeOptions)).toThrow(MessagePackError)
    expect(() => transform({ text: 'zz' }, decodeOptions)).toThrow(MessagePackError)
  })

  it('往返一致：编码后再解出同样的值', () => {
    const source: MessagePackInput = {
      text: '{"name":"工具库","n":870,"ok":true,"list":[1,2],"nil":null}',
    }
    const bytes = encode(JSON.parse(source.text))
    expect(JSON.stringify(decode(bytes).value)).toBe(JSON.stringify(JSON.parse(source.text)))
  })
})
