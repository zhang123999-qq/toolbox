import { describe, expect, it } from 'vitest'
import {
  ProtobufCodecError,
  decodeMessage,
  encodeMessage,
  parseProto,
  toBase64,
  toHex,
  transform,
  varintBytes,
  zigzagDecode,
  zigzagEncode,
} from './utils'
import type { ProtobufCodecOptions } from './schema'

const PROTO = [
  'syntax = "proto3";',
  'package demo;',
  '',
  'enum Status {',
  '  UNKNOWN = 0;',
  '  ACTIVE = 1;',
  '}',
  '',
  'message User {',
  '  int32 id = 1;',
  '  string name = 2;',
  '  sint32 score = 3;',
  '  Status status = 4;',
  '}',
].join('\n')

const structureOptions: ProtobufCodecOptions = { mode: 'structure', target: '', format: 'hex' }

describe('protobuf-codec / transform', () => {
  it('structure 模式输出 message 与 wire type', () => {
    const out = transform({ text: PROTO, values: '' }, structureOptions)
    expect(out).toContain('syntax: proto3')
    expect(out).toContain('package: demo')
    expect(out).toContain('message User {')
    expect(out).toContain('int32 id = 1;')
    expect(out).toContain('wire 0 (varint)')
    expect(out).toContain('string name = 2;')
  })

  it('encode 模式按字段号编码出字节', () => {
    const out = transform(
      { text: PROTO, values: '{"id": 1, "name": "abc"}' },
      { mode: 'encode', target: 'User', format: 'hex' },
    )
    // 08 01 | 12 03 61 62 63
    expect(out).toContain('hex:    08011203616263')
    expect(out).toContain('字节数: 7')
  })

  it('sint32 用 zigzag 编码，负数也能还原', () => {
    const document = parseProto(PROTO)
    const message = document.messages.find((item) => item.name === 'demo.User')
    const { bytes } = encodeMessage(document, message!, { score: -3 })
    expect(toHex(bytes)).toBe('1805')
    const decoded = decodeMessage(document, message!, bytes)
    expect(decoded.value['score']).toBe(-3)
  })

  it('decode 模式还原字段值并给出 JSON', () => {
    const out = transform(
      { text: PROTO, values: '080112036162632001' },
      { mode: 'decode', target: 'User', format: 'hex' },
    )
    expect(out).toContain('"name": "abc"')
    expect(out).toContain('4 status (Status) = "ACTIVE"')
  })

  it('空输入返回空字符串（边界）', () => {
    expect(transform({ text: '', values: '' }, structureOptions)).toBe('')
    expect(transform({ text: '   \n ', values: '' }, structureOptions)).toBe('')
  })

  it('proto 语法错误抛出 ProtobufCodecError（异常）', () => {
    expect(() => transform({ text: 'message {', values: '' }, structureOptions)).toThrow(
      ProtobufCodecError,
    )
  })

  it('编码时写了不存在的字段会报错', () => {
    expect(() =>
      transform(
        { text: PROTO, values: '{"nope": 1}' },
        { mode: 'encode', target: 'User', format: 'hex' },
      ),
    ).toThrow(ProtobufCodecError)
  })

  it('字段值不是 JSON 对象时报错', () => {
    expect(() =>
      transform(
        { text: PROTO, values: '[1,2]' },
        { mode: 'encode', target: 'User', format: 'hex' },
      ),
    ).toThrow(ProtobufCodecError)
  })

  it('varint 与 zigzag 的基本性质', () => {
    expect(toHex(varintBytes(1n))).toBe('01')
    expect(toHex(varintBytes(127n))).toBe('7f')
    expect(toHex(varintBytes(128n))).toBe('8001')
    expect(toHex(varintBytes(300n))).toBe('ac02')
    expect(zigzagEncode(-1n)).toBe(1n)
    expect(zigzagEncode(1n)).toBe(2n)
    expect(zigzagDecode(3n)).toBe(-2n)
    expect(toBase64(new Uint8Array([0x08, 0x01, 0x12, 0x03, 0x61, 0x62, 0x63]))).toBe(
      'CAESA2FiYw==',
    )
  })

  it('base64 输出与 hex 一致', () => {
    const out = transform(
      { text: PROTO, values: '{"id": 1}' },
      { mode: 'encode', target: 'User', format: 'base64' },
    )
    expect(out).toContain('base64: CAE=')
  })
})
