import { describe, expect, it } from 'vitest'
import type { CrcOptions } from './schema'
import {
  ALGORITHMS,
  MODES,
  compute,
  crc16Ccitt,
  crc16Modbus,
  crc32,
  crc32c,
  format,
  transform,
} from './utils'

const hex = { algorithm: 'crc32', mode: 'hex' } as const
const dec = { algorithm: 'crc32', mode: 'dec' } as const

/** 标准「check 值」样本：各算法文档都用 "123456789" 做自检 */
const CHECK = new TextEncoder().encode('123456789')

describe('crc-checksum / 已知向量（"123456789"）', () => {
  it('CRC-32 = 0xCBF43926', () => {
    expect(crc32(CHECK)).toBe(0xcbf43926)
  })

  it('CRC-32C（Castagnoli）= 0xE3069283', () => {
    expect(crc32c(CHECK)).toBe(0xe3069283)
  })

  it('CRC-16/MODBUS = 0x4B37', () => {
    expect(crc16Modbus(CHECK)).toBe(0x4b37)
  })

  it('CRC-16/CCITT-FALSE = 0x29B1', () => {
    expect(crc16Ccitt(CHECK)).toBe(0x29b1)
  })
})

describe('crc-checksum / 其它向量与边界', () => {
  it('空字节串返回各算法的 init 值', () => {
    const empty = new Uint8Array(0)
    expect(crc32(empty)).toBe(0x00000000)
    expect(crc32c(empty)).toBe(0x00000000)
    expect(crc16Modbus(empty)).toBe(0xffff)
    expect(crc16Ccitt(empty)).toBe(0xffff)
  })

  it('"abc" 的 CRC-32 = 0x352441C2', () => {
    expect(crc32(new TextEncoder().encode('abc'))).toBe(0x352441c2)
  })

  it('中文按 UTF-8 字节计算', () => {
    expect(crc32(new TextEncoder().encode('工具库'))).toBe(0x3827a60a)
  })

  it('CRC-32 与 CRC-32C 是两套参数，结果不同', () => {
    expect(crc32(CHECK)).not.toBe(crc32c(CHECK))
  })

  it('compute 覆盖四种算法，非法算法名报错', () => {
    expect(ALGORITHMS.map((algorithm) => compute(algorithm, CHECK))).toEqual([
      0xcbf43926, 0xe3069283, 0x4b37, 0x29b1,
    ])
    expect(() => compute('md5', CHECK)).toThrow(/不支持的校验算法/)
  })

  it('CRC-16 补足 4 位、CRC-32 补足 8 位十六进制', () => {
    expect(format('crc16-modbus', 'hex', 0x4b37)).toBe('0x4B37')
    expect(format('crc32', 'hex', 0x00000001)).toBe('0x00000001')
    expect(format('crc32', 'dec', 0xcbf43926)).toBe('3421780262')
    expect(MODES).toContain('dec')
  })
})

describe('crc-checksum / transform', () => {
  it('按选项输出十六进制（默认）', () => {
    expect(transform({ text: '123456789' }, hex)).toBe('0xCBF43926')
    expect(transform({ text: '123456789' }, { algorithm: 'crc16-ccitt', mode: 'hex' })).toBe(
      '0x29B1',
    )
  })

  it('按选项输出十进制', () => {
    expect(transform({ text: '123456789' }, dec)).toBe('3421780262')
    expect(transform({ text: '123456789' }, { algorithm: 'crc16-modbus', mode: 'dec' })).toBe(
      '19255',
    )
  })

  it('空输入返回空串（边界）', () => {
    expect(transform({ text: '' }, hex)).toBe('')
    expect(transform({ text: '' }, dec)).toBe('')
  })

  it('非法选项报错', () => {
    const badAlgorithm = { algorithm: 'md5', mode: 'hex' } as unknown as CrcOptions
    const badMode = { algorithm: 'crc32', mode: 'base64' } as unknown as CrcOptions
    expect(() => transform({ text: 'abc' }, badAlgorithm)).toThrow(/不支持的校验算法/)
    expect(() => transform({ text: 'abc' }, badMode)).toThrow(/不支持的输出格式/)
  })

  it('输入超过上限时报错', () => {
    expect(() => transform({ text: 'x'.repeat(200001) }, hex)).toThrow(/上限/)
  })
})
